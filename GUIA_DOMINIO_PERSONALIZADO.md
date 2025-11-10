# Guía para Conectar Dominio Personalizado de GoDaddy a Vercel

## ✅ ¡El Build Funcionó!

Ahora que el proyecto está desplegado correctamente en Vercel, puedes conectarlo a tu dominio personalizado.

---

## 🌐 Paso 1: Configurar Dominio en Vercel

### 1.1. Ir a Configuración de Dominios

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `lanavetest`
3. Click en **Settings** (en el menú superior)
4. En el menú lateral, click en **Domains**

### 1.2. Agregar Dominio

1. En el campo de texto, escribe tu dominio (ej: `tudominio.com` o `www.tudominio.com`)
2. Click en **Add**
3. Vercel te mostrará las instrucciones de configuración DNS

---

## 🔧 Paso 2: Configurar DNS en GoDaddy

Vercel te dará valores específicos, pero aquí está el proceso general:

### 2.1. Acceder a DNS en GoDaddy

1. Ve a [godaddy.com](https://godaddy.com) e inicia sesión
2. Ve a **My Products** > **Domains**
3. Click en tu dominio
4. Click en **DNS** o **Manage DNS**

### 2.2. Configurar Registros DNS

Vercel te dará dos opciones:

#### Opción A: Usar Registros A (Recomendado para dominio raíz)

Agrega estos registros:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | @ | `76.76.21.21` | 1 hora |
| A | @ | `76.223.126.88` | 1 hora |

**Nota:** Los valores IP pueden variar. Vercel te dará los valores exactos.

#### Opción B: Usar CNAME (Recomendado para subdominios)

Para `www.tudominio.com`:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| CNAME | www | `cname.vercel-dns.com` | 1 hora |

**Nota:** El valor exacto lo dará Vercel (será algo como `cname.vercel-dns.com` o un dominio específico).

### 2.3. Configurar Dominio Raíz (apex domain)

Para el dominio raíz (`tudominio.com`), GoDaddy requiere usar registros A. Vercel te dará las IPs exactas.

**Alternativa:** Si quieres usar CNAME para el dominio raíz, GoDaddy tiene una función especial:
- Usa un registro ALIAS o ANAME (si está disponible)
- O usa los registros A que Vercel proporciona

---

## ⏱️ Paso 3: Esperar Propagación DNS

1. **Tiempo de propagación:** 1-48 horas (normalmente 1-2 horas)
2. **Verificar estado:** En Vercel Dashboard > Domains, verás el estado:
   - 🟡 **Pending** - Esperando propagación
   - 🟢 **Valid** - Configurado correctamente
   - 🔴 **Invalid** - Error en configuración

### Verificar Propagación

Puedes verificar el estado con:
- [whatsmydns.net](https://www.whatsmydns.net) - Ver propagación global
- `nslookup tudominio.com` en terminal
- `dig tudominio.com` en terminal (Linux/Mac)

---

## 🔒 Paso 4: Configurar SSL (Automático)

Vercel configura SSL automáticamente:
- ✅ Certificado SSL gratuito (Let's Encrypt)
- ✅ Renovación automática
- ✅ HTTPS habilitado automáticamente

No necesitas hacer nada, Vercel lo maneja automáticamente una vez que el dominio esté configurado.

---

## 📝 Ejemplo Completo

### Dominio: `lanave.com`

**En Vercel:**
1. Settings > Domains
2. Agregar: `lanave.com`
3. Agregar: `www.lanave.com`
4. Copiar los valores DNS que Vercel proporciona

**En GoDaddy:**
1. DNS Management
2. Agregar registro A:
   - Nombre: `@`
   - Valor: `76.76.21.21` (IP de Vercel)
   - TTL: 1 hora
3. Agregar registro CNAME:
   - Nombre: `www`
   - Valor: `cname.vercel-dns.com` (valor de Vercel)
   - TTL: 1 hora

**Esperar:** 1-2 horas para propagación

**Resultado:** 
- `https://lanave.com` → Tu app en Vercel
- `https://www.lanave.com` → Tu app en Vercel

---

## 🐛 Troubleshooting

### El dominio no se conecta después de 24 horas

1. **Verifica los registros DNS:**
   - Asegúrate de que los valores IP sean correctos
   - Verifica que no haya registros conflictivos

2. **Limpia caché DNS:**
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Mac/Linux
   sudo dscacheutil -flushcache
   ```

3. **Verifica en Vercel:**
   - Ve a Settings > Domains
   - Revisa los mensajes de error
   - Vercel te dirá qué está mal

### Error: "Domain already in use"

- El dominio ya está configurado en otro proyecto de Vercel
- O está configurado en otro servicio
- Necesitas removerlo primero

### Error: "Invalid configuration"

- Revisa que los registros DNS en GoDaddy coincidan exactamente con lo que Vercel pide
- Verifica que no haya espacios extra
- Asegúrate de usar los valores exactos que Vercel proporciona

---

## ✅ Verificación Final

Una vez configurado:

1. ✅ El dominio muestra "Valid" en Vercel Dashboard
2. ✅ Puedes acceder a `https://tudominio.com`
3. ✅ El certificado SSL está activo (candado verde en el navegador)
4. ✅ La app carga correctamente

---

## 📞 Soporte

- **Vercel Docs:** https://vercel.com/docs/concepts/projects/domains
- **GoDaddy Help:** https://www.godaddy.com/help
- **Verificar DNS:** https://www.whatsmydns.net

---

**¡Listo!** Una vez configurado, tu dominio personalizado estará funcionando en Vercel.

