#!/usr/bin/env python3
"""
Script para scrapear MaxPlayGo y sincronizar con Supabase
Ejecutar: python sync-maxplaygo.py --date 15-09-2025
"""

import argparse
import json
import os
import requests
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Configuración - ahora desde variables de entorno
MAXPLAYGO_USERNAME = os.environ.get("MAXPLAYGO_USERNAME", "BANCA LA")
MAXPLAYGO_PASSWORD = os.environ.get("MAXPLAYGO_PASSWORD", "123456")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pmmjomdrkcnmdakytlen.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtbWpvbWRya2NubWRha3l0bGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzgxNTMsImV4cCI6MjA3MDUxNDE1M30.Ggxtm7FakwzzzpBCtGD_YfO2X8yEe5pbFl0DhW_ol7w")


def logout_maxplaygo(driver):
    """
    Cierra la sesión en MaxPlayGo
    
    Args:
        driver: WebDriver de Selenium
    """
    try:
        print("🚪 Cerrando sesión en MaxPlayGo...")
        
        # Buscar el botón de logout
        logout_button = driver.find_element(By.CSS_SELECTOR, "button.bg-gradient-cyan")
        logout_button.click()
        
        # Esperar a que redirija
        WebDriverWait(driver, 5).until(
            EC.url_contains("/login")
        )
        
        print("✅ Sesión cerrada correctamente")
    except Exception as e:
        print(f"⚠️ No se pudo cerrar sesión: {e}")


def scrape_maxplaygo(target_date: str, juego: str) -> list:
    """
    Scrapea datos de MaxPlayGo para una fecha y tipo de juego específicos
    
    Args:
        target_date: Fecha en formato DD-MM-YYYY
        juego: "O" para ANIMALITOS o "A" para LOTERIAS
    
    Returns:
        Lista de listas: [[nombre_agencia, ventas, premios], ...]
    """
    print(f"🔍 Scraping {juego} para fecha {target_date}...")
    
    # Configurar Chrome headless
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    
    # Support para GitHub Actions environment
    chrome_bin = os.environ.get("CHROME_BIN")
    if chrome_bin:
        chrome_options.binary_location = chrome_bin
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        # 1. Login
        print("📝 Iniciando sesión...")
        driver.get("https://web.maxplaygo.com/login")
        
        driver.find_element(By.ID, "usuario").send_keys(MAXPLAYGO_USERNAME)
        driver.find_element(By.ID, "clave").send_keys(MAXPLAYGO_PASSWORD)
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        WebDriverWait(driver, 10).until(
            EC.url_changes("https://web.maxplaygo.com/login")
        )
        print("✅ Login exitoso")
        
        # 2. Ir a venxcom
        print("📊 Navegando a venxcom...")
        driver.get("https://web.maxplaygo.com/venxcom/")
        
        # 3. Aplicar filtros
        print(f"🎯 Aplicando filtros: Fecha={target_date}, Nivel=G, Moneda=BS, Juego={juego}")
        
        driver.find_element(By.ID, "id_fecha").clear()
        driver.find_element(By.ID, "id_fecha").send_keys(target_date)
        
        driver.find_element(By.ID, "n-nivel").send_keys("G")
        driver.find_element(By.ID, "id_moneda").send_keys("BS")
        driver.find_element(By.ID, "id_juego").send_keys(juego)
        
        # 4. Submit
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[title='Detalles Ventas']")))
        print("✅ Filtros aplicados")
        
        # 5. Click en LA NAVE GRUPO
        print("🎯 Buscando LA NAVE GRUPO...")
        links = driver.find_elements(By.CSS_SELECTOR, "a[title='Detalles Ventas']")
        
        la_nave_link = None
        for link in links:
            if "LA NAVE GRUPO" in link.text:
                la_nave_link = link
                break
        
        if not la_nave_link:
            raise Exception("No se encontró el link de LA NAVE GRUPO")
        
        la_nave_link.click()
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr")))
        print("✅ Detalles cargados")
        
        # 6. Extraer datos de la tabla
        print("📋 Extrayendo datos de tabla...")
        rows = driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
        
        data = []
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            if len(cells) >= 3:
                agency_name = cells[0].text.strip()
                sales = cells[1].text.strip()
                prizes = cells[2].text.strip()
                
                if agency_name and agency_name.startswith("NAVE"):
                    data.append([agency_name, sales, prizes])
        
        print(f"✅ Extraídas {len(data)} agencias")
        return data
        
    except Exception as e:
        print(f"❌ Error durante el scraping: {e}")
        raise
    finally:
        # Siempre cerrar sesión antes de cerrar el navegador
        logout_maxplaygo(driver)
        driver.quit()


def sync_to_supabase(target_date: str, figuras_data: list, loterias_data: list):
    """
    Sincroniza datos scrapeados con Supabase
    
    Args:
        target_date: Fecha en formato DD-MM-YYYY
        figuras_data: Datos de ANIMALITOS
        loterias_data: Datos de LOTERIAS
    """
    print("📤 Enviando datos a Supabase...")
    
    url = f"{SUPABASE_URL}/functions/v1/sync-maxplaygo-agency"
    headers = {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "target_date": target_date,
        "figuras_data": figuras_data,
        "loterias_data": loterias_data
    }
    
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        result = response.json()
        if result.get("success"):
            print(f"✅ Sincronización exitosa!")
            print(f"   Agencias actualizadas: {result['data']['updatedAgenciesCount']}")
            for agency in result['data']['agencyResults']:
                print(f"   - {agency['name']} ({agency['system']}): Ventas={agency['sales']}, Premios={agency['prizes']}")
        else:
            print(f"❌ Error en la sincronización: {result.get('error')}")
    else:
        print(f"❌ Error HTTP {response.status_code}: {response.text}")


def main():
    parser = argparse.ArgumentParser(description="Scrapear MaxPlayGo y sincronizar con Supabase")
    parser.add_argument("--date", required=True, help="Fecha en formato DD-MM-YYYY (ej: 15-09-2025)")
    args = parser.parse_args()
    
    target_date = args.date
    
    # Validar formato de fecha
    try:
        datetime.strptime(target_date, "%d-%m-%Y")
    except ValueError:
        print("❌ Formato de fecha inválido. Usa DD-MM-YYYY (ej: 15-09-2025)")
        return
    
    print(f"🚀 Iniciando scraping para fecha: {target_date}\n")
    
    # Scrapear ANIMALITOS
    figuras_data = scrape_maxplaygo(target_date, "O")
    print(f"✅ FIGURAS: {len(figuras_data)} agencias\n")
    
    # Scrapear LOTERIAS
    loterias_data = scrape_maxplaygo(target_date, "A")
    print(f"✅ LOTERIAS: {len(loterias_data)} agencias\n")
    
    # Sincronizar con Supabase
    sync_to_supabase(target_date, figuras_data, loterias_data)
    
    print("\n✅ Proceso completado!")


if __name__ == "__main__":
    main()
