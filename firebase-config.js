// ------------------------------------------------------------------
// Configuração do projeto Firebase "frota-pai".
// ------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "AIzaSyBaMFpq9FBAyv1gMyZEkn5_0E2OBV79EEI",
  authDomain: "frota-pai-35adb.firebaseapp.com",
  projectId: "frota-pai-35adb",
  storageBucket: "frota-pai-35adb.firebasestorage.app",
  messagingSenderId: "767600578288",
  appId: "1:767600578288:web:e6867023a6d3fa7aff3c35"
};

// Não precisa mexer aqui embaixo.
// É o "endereço" único de onde os dados da frota ficam guardados.
export const DOC_PATH = { collection: "frota", doc: "estado" };
