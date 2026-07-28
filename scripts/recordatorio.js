const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
const APP_ID = "2bf8ee09-a009-49a5-8a61-24257be0e1b0";
const FIREBASE_URL = "https://despensa-granon-default-rtdb.europe-west1.firebasedatabase.app/pastilla.json";
const FIREBASE_AVISOS_URL = "https://despensa-granon-default-rtdb.europe-west1.firebasedatabase.app/pastilla_avisos.json";

function horaActualMadrid() {
  const texto = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hour12: false
  }).format(new Date());
  return parseInt(texto, 10);
}

function formatearFechaMadrid(fecha) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(fecha);
}

// Si ya ha pasado la medianoche (por un retraso de GitHub), la pastilla
// que estamos comprobando sigue siendo la de la noche anterior.
function claveDiaAComprobar(horaMadrid) {
  const ahora = new Date();
  if (horaMadrid <= 5) {
    const ayer = new Date(ahora.getTime() - 12 * 60 * 60 * 1000);
    return formatearFechaMadrid(ayer);
  }
  return formatearFechaMadrid(ahora);
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

  // Ventana amplia: de 22h a 3h de la madrugada, para tolerar retrasos de GitHub.
  const dentroDeVentana = hora >= 22 || hora <= 3;
  if (!dentroDeVentana) {
    console.log("Fuera del rango horario de comprobación. No se hace nada.");
    return;
  }

  const clave = claveDiaAComprobar(hora);
  console.log(`Comprobando el día: ${clave}`);

  const respuestaPastilla = await fetch(FIREBASE_URL);
  const datosPastilla = await respuestaPastilla.json();
  const tomada = datosPastilla && datosPastilla[clave];

  if (tomada) {
    console.log(`Ya está marcada la pastilla de ese día (${clave}) a las ${tomada}. No se envía aviso.`);
    return;
  }

  const respuestaAvisos = await fetch(FIREBASE_AVISOS_URL);
  const datosAvisos = await respuestaAvisos.json();
  const yaAvisado = datosAvisos && datosAvisos[clave];

  if (yaAvisado) {
    console.log(`Ya se envió un aviso para el día ${clave}. No se repite.`);
    return;
  }

  console.log(`No está marcada la pastilla del día ${clave}. Enviando notificación.`);
  await enviarAviso();

  await fetch(FIREBASE_AVISOS_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [clave]: true })
  });
}

main().catch((error) => {
  console.error("Error al ejecutar la comprobación:", error);
  process.exit(1);
});
