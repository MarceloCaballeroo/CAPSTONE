# Usa una imagen base oficial (Cambiar según tu lenguaje, ej: python:3.10-slim o node:18-alpine)
FROM node:18-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias (Ajustar a package.json o requirements.txt)
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto del código fuente al contenedor
COPY . .

# Expone el puerto en el que corre la API (Ajustar según tu configuración)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]