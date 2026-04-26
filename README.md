# TRACE

**TRACE** es una aplicación de gestión financiera personal basada en el método de sobres (budgeting by envelopes). Diseñada con una estética minimalista, oscura y premium, TRACE te permite tener un control total y visual de tus gastos y ahorros.

![TRACE Logo](https://img.shields.io/badge/App-TRACE-092230?style=for-the-badge)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)

---

## Características Principales

### Gestión por Sobres
- **Sobres de Gasto**: Define un presupuesto mensual y lleva un control de lo que te queda disponible.
- **Sobres de Ahorro**: Establece metas de ahorro y visualiza cuánto te falta para alcanzarlas.
- **Modo Ilimitado**: Crea sobres sin límites para simplemente trackear flujos de dinero.

### Personalización Premium
- **Avatares Personalizados**: Sube tus propias fotos para identificar cada sobre o usa íconos vectoriales modernos.
- **Paleta de Colores Curada**: Interfaz en modo oscuro con acentos en HSL para una experiencia visual de alto nivel.

### Datos y Exportación
- **Exportación a CSV**: Genera reportes detallados de todas tus transacciones y compártelos vía WhatsApp, correo o guárdalos en la nube.
- **Historial Detallado**: Cada sobre guarda su historial de transacciones con filtros por mes y categorías.
- **Reinicio Inteligente**: Reinicia sobres individualmente o de forma global para comenzar un nuevo periodo, moviendo automáticamente los datos al historial.

### Herramientas Avanzadas
- **Conversión de Moneda**: Soporte para CRC, USD y EUR con tasas de cambio configurables.
- **Métodos de Pago y Categorías**: Totalmente personalizables para adaptarse a tu estilo de vida.
- **Fechas Manuales**: Registra transacciones con la fecha exacta en que ocurrieron.

---

## Tecnologías Utilizadas

- **Framework**: React Native con Expo (SDK 54).
- **Iconografía**: Lucide React Native.
- **Estado Global**: React Context API.
- **Almacenamiento**: AsyncStorage para persistencia local.
- **Utilidades**: 
  - `expo-image-picker` para fotos de perfil.
  - `expo-sharing` y `expo-file-system` para reportes.
  - `@react-native-community/datetimepicker` para selección de fechas.

---

## Instalación y Uso

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repo>
   cd spent-app
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npx expo start
   ```

4. **Ejecutar en tu dispositivo:**
   Escanea el código QR con la app Expo Go (Android/iOS).
