const ejerciciosLocal = [
    /* pecho */
    { id: "0001", nombre: "Press de banca (Barra)", gif: "/gifs/press-banca-barra.gif", parteDelCuerpo: "Pecho", subMusculos: ["Triceps", "Hombros"], equipamiento: "Barra" },
    { id: "0002", nombre: "Press de banca inclinado (Mancuernas)", gif: "/gifs/press-banca-inclinado-manc.jpg", parteDelCuerpo: "Pecho", subMusculos: ["Triceps", "Hombros"], equipamiento: "Mancuernas" },
    { id: "0003", nombre: "Aperturas (Polea)", gif: "/gifs/aperturas-polea.jpg", parteDelCuerpo: "Pecho", subMusculos: [], equipamiento: "Polea" },
    { id: "0060", nombre: "Press de banca smith (Maquina)", gif: "/gifs/press-banca-smith.mp4", parteDelCuerpo: "Pecho", subMusculos: ["Hombros", "triceps"], equipamiento: "Maquinas" },

    /* triceps */
    { id: "0004", nombre: "Extensión de tríceps por encima de la cabeza (Polea)", gif: "/gifs/extension-cabeza-polea.gif", parteDelCuerpo: "Triceps", subMusculos: [], equipamiento: "Polea" },
    { id: "0005", nombre: "Tríceps con barra (Polea)", gif: "/gifs/triceps-con-barra.gif", parteDelCuerpo: "Triceps", subMusculos: [], equipamiento: "Polea" },
    { id: "0006", nombre: "Tríceps con soga (Polea)", gif: "/gifs/triceps-con-soga.gif", parteDelCuerpo: "Triceps", subMusculos: [], equipamiento: "Polea" },
    { id: "0007", nombre: "Tríceps a un brazo (Polea)", subMusculos: [], gif: "/gifs/triceps-una-mano.gif", parteDelCuerpo: "Triceps", equipamiento: "Polea" },

    /* biceps */
    { id: "0008", nombre: "Curl Z (Barra)", gif: "/gifs/curl-z.gif", parteDelCuerpo: "Biceps", equipamiento: "Barra", subMusculos: [] },
    { id: "0009", nombre: "Curl martillo (Mancuernas)", gif: "/gifs/curl-martillo-con-mancuernas.jpg", parteDelCuerpo: "Biceps", subMusculos: ["Antebrazo"], equipamiento: "Mancuernas" },
    { id: "0010", nombre: "Curl predicador (Maquina)", gif: "/gifs/predicador-maquina.gif", parteDelCuerpo: "Biceps", equipamiento: "Maquinas" },
    { id: "0011", nombre: "Curl predicador (Barra)", gif: "/gifs/predicador-barra.gif", subMusculos: [], parteDelCuerpo: "Biceps", equipamiento: "Barra" },

    /* espalda */
    { id: "0012", nombre: "Jalón al pecho - Agarre abierto (Maquina)", gif: "/gifs/jalon-pecho-abierto.gif", parteDelCuerpo: "Espalda", subMusculos: ["Dorsales", "Bíceps", "Antebrazos"], equipamiento: "Maquinas" },
    { id: "0055", nombre: "Jalón al pecho - Agarre neutro (Maquina)", gif: "/gifs/jalon-pecho-neutro.jpg", parteDelCuerpo: "Espalda", subMusculos: ["Dorsales", "Bíceps", "Antebrazos"], equipamiento: "Maquinas" },
    { id: "0013", nombre: "Jalón al pecho - Agarre cerrado (Maquina)", gif: "/gifs/jalon-pecho-cerrado.gif", parteDelCuerpo: "Espalda", equipamiento: "Maquinas", subMusculos: ["Dorsales", "Bíceps", "Antebrazos"] },
    { id: "0014", nombre: "Remo en punta (Maquina)", gif: "/gifs/remo-punta.gif", parteDelCuerpo: "Espalda", subMusculos: ["Dorsales", "Bíceps", "Antebrazos"], equipamiento: "Maquinas" },
    { id: "0015", nombre: "Remo inclinado (Barra)", gif: "/gifs/remo-parado.gif", parteDelCuerpo: "Espalda", equipamiento: "Barra", subMusculos: ["Dorsales", "Bíceps", "Antebrazos"] },
    { id: "0016", nombre: "Remo sentado - Agarre V (Maquina)", gif: "/gifs/remo-sentado-v.gif", parteDelCuerpo: "Espalda", equipamiento: "Maquinas", subMusculos: ["Dorsales", "Bíceps", "Antebrazos"] },
    { id: "0056", nombre: "Remo sentado - Agarre abierto (Maquina)", gif: "/gifs/remo-sentado-abierto.jpg", parteDelCuerpo: "Espalda", subMusculos: ["Dorsales", "Bíceps", "Antebrazos"], equipamiento: "Maquinas" },


    /* cuadriceps */
    { id: "0017", nombre: "Sentadilla Hack (Maquina)", gif: "/gifs/sentadilla-hack.gif", parteDelCuerpo: "Cuadriceps", subMusculos: ["Gluteos", "Isquiotibiales"], equipamiento: "Maquinas" },
    { id: "0018", nombre: "Sentadilla libre (Barra)", gif: "/gifs/sentadilla-libre.gif", parteDelCuerpo: "Cuadriceps", subMusculos: ["Gluteos", "Isquiotibiales"], equipamiento: "Barra" },
    { id: "0019", nombre: "Sentadilla smith (Maquina)", gif: "/gifs/sentadilla-smith.gif", parteDelCuerpo: "Cuadriceps", subMusculos: ["Gluteos", "Isquiotibiales"], equipamiento: "Maquinas" },
    { id: "0020", nombre: "Prensa (Maquina)", gif: "/gifs/prensa.gif", parteDelCuerpo: "Cuadriceps", subMusculos: ["Gluteos", "Isquiotibiales"], equipamiento: "Maquinas" },
    { id: "0021", nombre: "Extension (Maquina)", gif: "/gifs/extension-pierna.gif", parteDelCuerpo: "Cuadriceps", subMusculos: [], equipamiento: "Maquinas" },
    { id: "0022", nombre: "Peso muerto smith (Maquina)", gif: "/gifs/peso-muerto-smith.jpg", parteDelCuerpo: "Cuadriceps", subMusculos: ["Gluteos", "Isquiotibiales", "Espalda", "Dorsales", "Trapecio"], equipamiento: "Maquinas" },
    { id: "0023", nombre: "Peso muerto libre (Barra)", gif: "/gifs/peso-muerto.gif", parteDelCuerpo: "Cuadriceps", equipamiento: "Barra", subMusculos: ["Gluteos", "Isquiotibiales", "Espalda", "Dorsales", "Trapecio"], },
    { id: "0061", nombre: "Estocadas (Mancuernas)", gif: "/gifs/estocadas.gif", parteDelCuerpo: "Cuadriceps", equipamiento: "Mancuernas", subMusculos: ["Gluteos", "Isquiotibiales"], },


    /* isquiotibiales */
    { id: "0024", nombre: "Curl femoral sentado (Maquina)", gif: "/gifs/curl-sentado-isquio.gif", parteDelCuerpo: "Isquiotibiales", equipamiento: "Maquinas", subMusculos: ["Gemelos"], },
    { id: "0025", nombre: "Curl femoral acostado (Maquina)", gif: "/gifs/curl-acostado-isquio.gif", parteDelCuerpo: "Isquiotibiales", equipamiento: "Maquinas", subMusculos: ["Gemelos"], },

    /* gemelos */
    { id: "0026", nombre: "Elevacion de gemelos parado (Maquina)", gif: "/gifs/elevacion-gemelo-parado.jpg", parteDelCuerpo: "Gemelos", equipamiento: "Maquinas", subMusculos: [], },
    { id: "0027", nombre: "Elevacion de gemelos sentado (Maquina)", gif: "/gifs/elevacion-gemelo-sentado.jpg", parteDelCuerpo: "Gemelos", equipamiento: "Maquinas", subMusculos: [], },

    /* gluteos */
    { id: "0028", nombre: "Patada de gluteo (Maquina)", gif: "/gifs/patada-gluteo-maquina.jpg", parteDelCuerpo: "Gluteos", equipamiento: "Maquinas", subMusculos: ["Isquiotibiales"] },
    { id: "0029", nombre: "Patada de gluteo (Polea)", gif: "/gifs/patada-gluteo-polea.jpg", parteDelCuerpo: "Gluteos", equipamiento: "Polea", subMusculos: ["Isquiotibiales"] },
    { id: "0030", nombre: "Elevacion de cadera smith (Maquina)", gif: "/gifs/elevacion-cadera-smith.gif", parteDelCuerpo: "Gluteos", equipamiento: "Maquinas", subMusculos: ["Isquiotibiales", "Cuadriceps", "Adductores"] },
    { id: "0031", nombre: "Elevacion de cadera (Barra)", gif: "/gifs/elevacion-cadera-barra.jpg", parteDelCuerpo: "Gluteos", equipamiento: "Barra", subMusculos: ["Isquiotibiales", "Cuadriceps", "Adductores"] },
    { id: "0057", nombre: "Hiperextension (Maquina)", gif: "/gifs/hiperextension-maq.jpg", parteDelCuerpo: "Gluteos", equipamiento: "Maquinas", subMusculos: ["Isquiotibiales", "Espalda"] },

    { id: "0032", nombre: "Step up (Mancuernas)", gif: "/gifs/step-up-manc.gif", parteDelCuerpo: "Gluteos", equipamiento: "Mancuernas", subMusculos: ["Isquiotibiales", "Cuadriceps"] },


    /* Adductores */
    { id: "0033", nombre: "Aduccion de caderas (Maquina)", gif: "/gifs/aducciom-cad-maq.jpg", parteDelCuerpo: "Adductores", equipamiento: "Maquinas", subMusculos: [] },
    { id: "0034", nombre: "Aduccion de caderas (Polea)", gif: "/gifs/aduccion-cad-polea.jpg", parteDelCuerpo: "Adductores", equipamiento: "Polea", subMusculos: [] },

    /* abductores */
    { id: "0035", nombre: "Abduccion de caderas (Maquina)", gif: "/gifs/abduccion-cad-maq.jpg", parteDelCuerpo: "Abductores", equipamiento: "Maquinas", subMusculos: [] },
    { id: "0036", nombre: "Abduccion de caderas (Polea)", gif: "/gifs/abduccion-cad-polea.jpg", parteDelCuerpo: "Abductores", equipamiento: "Polea", subMusculos: [] },
    { id: "0058", nombre: "Abduccion de caderas de pie (Maquina)", gif: "/gifs/abduccion-cad-maq-pie.jpg", parteDelCuerpo: "Abductores", equipamiento: "Maquinas", subMusculos: ["Gluteos"] },

    /* hombro */
    { id: "0037", nombre: "Vuelos posteriores (Mancuernas)", gif: "/gifs/vuelos-poste-manc.gif", parteDelCuerpo: "Hombros", equipamiento: "Mancuernas", subMusculos: ["Trapecio"] },
    { id: "0038", nombre: "Vuelos posteriores (Maquina)", gif: "/gifs/vuelos-poste-maq.gif", parteDelCuerpo: "Hombros", equipamiento: "Maquinas", subMusculos: ["Espalda"] },
    { id: "0039", nombre: "Vuelos posteriores (Polea)", gif: "/gifs/vuelos-poste-polea.jpg", parteDelCuerpo: "Hombros", equipamiento: "Polea", subMusculos: ["Espalda"] },
    { id: "0040", nombre: "Vuelos posteriores invertido (Mancuernas)", gif: "/gifs/vuelos-poste-invertido.jpg", parteDelCuerpo: "Hombros", equipamiento: "Mancuernas", subMusculos: ["Espalda"] },
    { id: "0041", nombre: "Elevacion lateral sentado (Maquina)", gif: "/gifs/elevaciones-lat-maq.jpg", parteDelCuerpo: "Hombros", equipamiento: "Maquinas", subMusculos: [] },
    { id: "0042", nombre: "Elevacion lateral parado (Maquina)", gif: "/gifs/elevaciones-lat-p-maq.jpg", parteDelCuerpo: "Hombros", equipamiento: "Maquinas", subMusculos: [] },
    { id: "0043", nombre: "Elevacion lateral (Mancuernas)", gif: "/gifs/elevaciones-lat-manc.gif", parteDelCuerpo: "Hombros", equipamiento: "Mancuernas", subMusculos: [] },
    { id: "0044", nombre: "Elevacion lateral (Polea)", gif: "/gifs/elevaciones-lat-polea.jpg", parteDelCuerpo: "Hombros", equipamiento: "Polea", subMusculos: [] },
    { id: "0045", nombre: "Elevacion lateral a un brazo (Polea)", gif: "/gifs/elevaciones-lat-uno-polea.jpg", parteDelCuerpo: "Hombros", equipamiento: "Polea", subMusculos: [] },
    { id: "0046", nombre: "Press militar (Maquina)", gif: "/gifs/press-militar-maq.gif", parteDelCuerpo: "Hombros", equipamiento: "Maquinas", subMusculos: ["Triceps"] },
    { id: "0047", nombre: "Press militar parado (Mancuernas)", gif: "/gifs/press-militar-mac-p.jpg", parteDelCuerpo: "Hombros", equipamiento: "Mancuernas", subMusculos: ["Triceps"] },
    { id: "0048", nombre: "Press militar sentado (Mancuernas)", gif: "/gifs/press-militar-mac-s.jpg", parteDelCuerpo: "Hombros", equipamiento: "Mancuernas", subMusculos: ["Triceps"] },
    { id: "0049", nombre: "Press militar parado (Barra)", gif: "/gifs/press-militar-b-p.jpg", parteDelCuerpo: "Hombros", equipamiento: "Barra", subMusculos: ["Triceps", "Abdominales"] },
    { id: "0050", nombre: "Press militar sentado (Mancuernas)", gif: "/gifs/press-militar-b-s.jpg", parteDelCuerpo: "Hombros", equipamiento: "Mancuernas", subMusculos: ["Triceps"] },
    { id: "0051", nombre: "Tiron a la cara (Polea)", gif: "/gifs/face-pull.jpg", parteDelCuerpo: "Hombros", equipamiento: "Polea", subMusculos: ["Espalda"] },


    /* abdominales */
    { id: "0052", nombre: "Elevacion de piernas", gif: "/gifs/elevacion-piernas.gif", parteDelCuerpo: "Abdominales", equipamiento: "P. corporal", subMusculos: [""] },
    { id: "0053", nombre: "Adbominales cortos (Peso)", gif: "/gifs/abd-cortos-p.jpg", parteDelCuerpo: "Abdominales", equipamiento: "Mancuernas", subMusculos: [""] },
    { id: "0054", nombre: "Plancha", gif: "/gifs/plancha.jpg", parteDelCuerpo: "Abdominales", equipamiento: "P. corporal", subMusculos: [""], esTiempo: true },
    { id: "0059", nombre: "Rueda abdominal", gif: "/gifs/rueda-abd.mp4", parteDelCuerpo: "Abdominales", equipamiento: "P. corporal", subMusculos: ["Hombros"] },


];

export default ejerciciosLocal;
