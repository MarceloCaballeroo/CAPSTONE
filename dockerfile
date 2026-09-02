# Next.js 16 requiere Node.js 20.9 o superior.
FROM node:22-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias (Ajustar a package.json o requirements.txt)
COPY package*.json ./

RUN npm ci

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Copia el resto del código fuente al contenedor
COPY . .

RUN npm run build

# Expone el puerto en el que corre la API (Ajustar según tu configuración)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]