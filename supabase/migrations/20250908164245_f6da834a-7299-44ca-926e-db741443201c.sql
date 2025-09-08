-- Agregar política para que los taquilleros puedan insertar sus propios cuadres
CREATE POLICY "Users can manage their own cuadres summary"
ON daily_cuadres_summary 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);