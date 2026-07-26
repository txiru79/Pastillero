const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
const APP_ID = "2bf8ee09-a009-49a5-8a61-24257be0e1b0";
const FIREBASE_URL = "https://despensa-granon-default-rtdb.europe-west1.firebasedatabase.app/pastilla.json";

function horaActualMadrid() {
  const texto = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hour12: false
  }).format(new Date());
  return parseInt(texto, 10);
}

function claveHoyMadrid() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

async function enviarAviso() {
  const respuesta = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${ONESIGNAL_API_KEY}`
    },
    body: JSON.stringify({
      app_id: APP_ID,
      included_segments: ["Subscribed Users"],
      headings: { es: "Recordatorio de tu pastilla" },
      contents: { es: "No has marcado la pastilla de hoy. Abre la app para confirmarlo." }
    })
  });
  const resultado = await respuesta.json();
  console.log("Respuesta de OneSignal:", JSON.stringify(resultado));
}

async function main() {
  const hora = horaActualMadrid();
  console.log(`Hora actual en Madrid: ${hora}h`);

  if (hora !== 23) {
    console.log("Todavía no son las 23:00 en Madrid. No se hace nada.");
    return;
  }

  const clave = claveHoyMadrid();
  console.log(`Comprobando el día: ${clave}`);

  const respuesta = await fetch(FIREBASE_URL);
  const datos = await respuesta.json();
  const tomada = datos && datos[clave];

  if (tomada) {
    console.log(`Ya está marcada la pastilla de hoy (${clave}) a las ${tomada}. No se envía aviso.`);
    return;
  }

  console.log(`No está marcada la pastilla de hoy (${clave}). Enviando notificación.`);
  await enviarAviso();
}

main().catch((error) => {
  console.error("Error al ejecutar la comprobación:", error);
  process.exit(1);
});
