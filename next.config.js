/** @type {import('next').NextConfig} */

// Commit que produjo ESTE bundle (v5.1 · P0-1).
//
// Se captura en tiempo de BUILD y se inlinea, no se lee del entorno en tiempo
// de ejecución ni se infiere desde el cliente: lo que interesa es qué código
// generó el artefacto que el navegador está sirviendo, y eso queda fijado al
// compilar. Un valor leído en runtime podría describir un despliegue distinto
// del que produjo el JavaScript que se está ejecutando.
//
// Hasta ahora los workers sellaban su commit y el dashboard no, así que
// responder a «¿está desplegado lo último?» exigía buscar cadenas dentro de
// JavaScript minificado. Eso no es una comprobación: es una arqueología.
const commitDelBuild =
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.SOURCE_COMMIT ||
  ''

const nextConfig = {
  reactStrictMode: true,
  env: {
    ELEVE_DASHBOARD_COMMIT: commitDelBuild ? commitDelBuild.slice(0, 7) : '',
    ELEVE_BUILD_TIME: new Date().toISOString(),
  },
}

module.exports = nextConfig
