# TFM4 · Prototipo interactivo de Revenue Management

Prototipo de la Entrega 04 de Evolve Academy para consultar el riesgo de cancelación de reservas hoteleras. La interfaz es estática y usa HTML, CSS y JavaScript. El histórico incluido permite ejecutar la demo sin las carpetas de entregas anteriores, paquetes adicionales ni acceso a Internet.

## Abrir desde Visual Studio Code

1. Abre **Archivo → Abrir carpeta…** y selecciona `C:\Users\panio\Documents\Curso\DataScience\TFM4`.
2. Abre **Terminal → Nueva terminal**. Desde la raíz de TFM4 ejecuta:

   ```powershell
   python -m http.server 8000 --bind 127.0.0.1 --directory prototipo
   ```

   Si `python` apunta al acceso directo de Microsoft Store, usa el entorno del curso:

   ```powershell
   & ..\venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1 --directory prototipo
   ```

3. Abre [http://127.0.0.1:8000](http://127.0.0.1:8000) en el navegador. Mantén la terminal abierta durante la demo y usa **Ctrl+C** para detener el servidor. La página usa módulos y carga el JSON por HTTP.

## Recorrido de prueba

1. Desde **Inicio**, entra en **Histórico**. Busca el ID `116617`. También puedes combinar hotel, partición, mes de alta estimada y prioridad.
2. Pulsa **Abrir**. La ficha carga los datos reales, una estimación sin calibrar del **90,5 %** y prioridad alta, posición **1 de 7.869** en el lote de prueba de enero de 2017.
3. Cambia la antelación a `-1` y pulsa **Validar datos**. El resultado guardado desaparece y el formulario indica el error junto al campo.
4. Recupera la ficha desde el histórico o introduce los datos de otra reserva para validar el formulario. La predicción de reservas nuevas aparece desactivada hasta integrar el pipeline.

## Alcance y procedencia

- **Operativo.** Navegación, búsqueda por ID, filtros combinables, paginación, carga de fichas, visualización del score guardado y su prioridad, validación manual y recuperación de errores de carga.
- **Por integrar.** Inferencia de entradas nuevas y gestión del pipeline ajustado. Las acciones preventivas son orientaciones para revisión humana. La aplicación carece de envío de mensajes, conexión a un PMS y persistencia de formularios.
- **Histórico.** 40.576 filas puntuadas en TMF3 (14.011 de validación y 26.565 de prueba). La prioridad y la posición corresponden al lote original de ambos hoteles. Aplicar filtros conserva esa referencia. El JSON omite el país y el desenlace de la reserva.
- **Exportación reproducible.** Desde TFM4, con TMF3 en la carpeta hermana, ejecuta `python scripts/exportar_historico.py`. Para una ubicación distinta, añade `--origen "C:\ruta\a\TMF3"`. El script verifica la huella del Gold, cruza IDs y comprueba la asignación del cupo antes de actualizar `prototipo/datos/historico.json`.
- **Código.** `prototipo/datos.js` carga el histórico. `prototipo/app.js` gestiona navegación, formularios y presentación. La futura inferencia se integrará como servicio independiente.

[Diseño UX, mockup original y capturas del prototipo](docs/entregas/04_diseno_frontal_ux.md)
