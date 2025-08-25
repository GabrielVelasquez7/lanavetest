import { supabase } from "@/integrations/supabase/client";

export const createTestUser = async () => {
  try {
    console.log('Creando usuario taquillero...');
    
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: 'agenciaprueba@gmail.com',
        password: 'TempPass123!',
        full_name: 'Usuario Prueba Taquillero',
        role: 'taquillero',
        agency_id: '4e331754-2ca9-44c6-8a9f-c9888a9ccf10' // Agencia Central
      }
    });

    if (error) {
      console.error('Error creando usuario:', error);
      return { success: false, error };
    } else {
      console.log('Usuario creado exitosamente:', data);
      return { success: true, data };
    }
  } catch (error) {
    console.error('Excepción:', error);
    return { success: false, error };
  }
};

// Ejecutar automáticamente
createTestUser().then(result => {
  if (result.success) {
    console.log('✅ Usuario taquillero creado:');
    console.log('📧 Email: agenciaprueba@gmail.com');
    console.log('🔐 Contraseña: TempPass123!');
    console.log('👤 Rol: taquillero');
    console.log('🏢 Agencia: Agencia Central');
  } else {
    console.log('❌ Error:', result.error);
  }
});