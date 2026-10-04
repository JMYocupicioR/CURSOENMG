// src/content/modules/module-05-repetitive-stimulation.ts
import { Module } from '../../types/content';
import nmjIllustration from '../../assets/images/nmj-synapse-illustration.webp';
import nmjDiagram from '../../assets/images/nmj-physiology-diagram.svg';

export const module05: Module = {
  id: 'repetitive-stimulation',
  number: 5,
  title: 'Estimulación Nerviosa Repetitiva',
  titleEn: 'Repetitive Nerve Stimulation (RNS)',
  emoji: '⚡',
  description: 'Fisiología profunda de la unión neuromuscular, protocolos de ENR y diagnóstico diferencial de miastenia y Lambert-Eaton',
  descriptionEn: 'Deep NMJ physiology, RNS protocols and differential diagnosis of MG and LEMS',
  color: 'from-blue-600 to-indigo-800',
  icon: 'Zap',
  topics: [
    {
      id: 'rns-principles',
      title: 'Principios de la ENR',
      children: [
        {
          id: 'nmj-physiology',
          title: 'Fisiología de la unión neuromuscular (UNM)',
          titleEn: 'Microscopic Physiology of the NMJ',
          content: `La unión neuromuscular (UNM) es una sinapsis química altamente especializada. Su función es convertir cada impulso eléctrico del nervio motor en una contracción muscular con una fidelidad del 100% en condiciones normales. Este proceso depende de una arquitectura microscópica muy precisa y de una cascada molecular perfectamente coordinada.

**Estructura de la Placa Terminal**

La UNM se divide en tres regiones con funciones específicas:

* **Región Presináptica (Terminal Nervioso):** Es la parte final del axón motor. Aquí la mielina desaparece y el terminal se expande en un bulbo lleno de mitocondrias (fuente de energía) y aproximadamente 200,000 vesículas sinápticas. Cada vesícula es un paquete llamado "Cuanto" que contiene unas 10,000 moléculas de Acetilcolina (ACh). Las vesículas se organizan en tres compartimentos: el **Pool Primario** (~1,000 vesículas de liberación inmediata), el **Pool de Movilización** (~10,000 vesículas que reponen al primario en 1-2 segundos) y el **Pool de Reserva** (~300,000 vesículas).

* **Hendidura Sináptica:** Es el espacio de solo 50 nanómetros que separa el nervio del músculo. Tiene una hendidura primaria y múltiples hendiduras secundarias (pliegues). En este espacio se encuentra anclada la enzima **Acetilcolinesterasa (AChE)**, responsable de destruir la ACh una vez que ha cumplido su función, en menos de 1 milisegundo.

* **Región Postsináptica (Membrana Muscular):** La membrana del músculo no es lisa, tiene pliegues profundos con dos zonas funcionales distintas. En las **Crestas** (puntos altos) se concentran masivamente los **Receptores Nicotínicos de ACh** (más de 10,000 por micrómetro cuadrado). En los **Valles** (profundidad de los pliegues) se ubican los **Canales de Sodio dependientes de voltaje** (Nav 1.4) y la AChE.

**Cascada de Liberación de ACh**

La liberación de ACh no es aleatoria; es un evento explosivo y coordinado que sigue estos pasos:

* **Paso 1 – Llegada del Impulso:** El potencial de acción viaja por el axón y despolariza la membrana del terminal nervioso.
* **Paso 2 – Entrada de Calcio:** La despolarización abre los **Canales de Calcio tipo P/Q**, que están organizados en dobles filas paralelas en las "zonas activas" del terminal. El Calcio entra masivamente al interior de la célula nerviosa.
* **Paso 3 – Maquinaria SNARE:** El Calcio activa una maquinaria molecular de fusión. La **Sinaptobrevina** (proteína de la vesícula) se engancha con la **Sintaxina** y la **SNAP-25** (proteínas de la membrana del terminal) formando un complejo tipo "cremallera". La **Sinaptotagmina**, que actúa como el sensor final de Calcio, dispara la fusión de la vesícula con la membrana.
* **Paso 4 – Exocitosis:** La vesícula se abre y libera su contenido de ACh hacia la hendidura sináptica. En cada impulso se liberan entre 50 y 300 vesículas simultáneamente. El número de vesículas liberadas se llama **Contenido Cuántico (m)** y depende de dos factores: cuántas vesículas están disponibles (n) y la probabilidad de que se liberen (p).
* **Paso 5 – Activación del Receptor:** La ACh cruza la hendidura (50 nm) casi instantáneamente y se une a los Receptores Nicotínicos en las crestas. Se necesitan 2 moléculas de ACh para abrir cada receptor. Al abrirse, permite la entrada masiva de Sodio (Na+) y una salida menor de Potasio (K+).
* **Paso 6 – Generación del EPP:** La entrada de Na+ despolariza localmente la membrana muscular, creando el **Potencial de Placa Terminal (EPP)**. Si este EPP es lo suficientemente grande, activa los Canales de Sodio Nav 1.4 (en los valles), disparando un Potencial de Acción Muscular que viaja por toda la fibra y produce la contracción.
* **Paso 7 – Reciclaje:** La AChE destruye inmediatamente la ACh sobrante en la hendidura, cerrando los receptores y dejando la placa lista para el siguiente impulso.

**Margen de Seguridad**

El Margen de Seguridad es el concepto más importante para entender la ENR. Es la diferencia entre la cantidad de ACh que el nervio libera y la cantidad mínima necesaria para generar un potencial de acción muscular. En personas sanas, el nervio libera **4 a 5 veces más ACh de la necesaria**. Esto significa que incluso si la liberación de ACh cae un poco durante la estimulación repetitiva (algo normal), el EPP siempre supera el umbral y el músculo siempre responde.`,
          imageUrls: [
            { src: nmjIllustration, alt: 'Ilustración Médica de la UNM', caption: 'Representación artística de la UNM: vesículas presinápticas, canales de Ca2+ y receptores nicotínicos en las crestas' },
            { src: nmjDiagram, alt: 'Diagrama de Flujo de la Transmisión', caption: 'Esquema paso a paso: desde la llegada del potencial de acción hasta la contracción muscular' }
          ],
          youtubeUrls: [
            { title: 'Fisiología de la Unión Neuromuscular', videoId: 'rJyHsZpR5Kc' }
          ],
          clinicalPearls: [
            'En la **Miastenia Gravis**, se pierden receptores nicotínicos de las crestas (ataque autoinmune), por lo que la misma cantidad de ACh genera un EPP más pequeño que puede caer bajo el umbral.',
            'En el **Lambert-Eaton**, los anticuerpos atacan los Canales de Calcio P/Q del terminal nervioso, reduciendo dramáticamente la entrada de Calcio y por lo tanto la liberación de ACh (contenido cuántico muy bajo).',
            'La AChE destruye el ACh en menos de 1 ms. Si se bloqueara (como con los insecticidas organofosforados), el receptor se desensibilizaría y la transmisión fallaría igualmente.',
            'Los inhibidores de la colinesterasa como la **Piridostigmina** mejoran los síntomas de MG al prolongar la vida media de la ACh en la hendidura, compensando parcialmente la pérdida de receptores.'
          ],
          keyPoints: [
            'Un Cuanto = 1 vesícula = ~10,000 moléculas de ACh.',
            'Los tres pools: Primario (1k, inmediato), Movilización (10k, 1-2s), Reserva (300k).',
            'Canales de Calcio P/Q: Diana autoinmune en Lambert-Eaton.',
            'Complejo SNARE (Sinaptobrevina + Sintaxina + SNAP-25): La "cremallera" de fusión.',
            'Crestas = Receptores ACh (diana en MG). Valles = Canales Nav 1.4 + AChE.',
            'Contenido Cuántico (m) normal: 50-300 vesículas por impulso.',
            'Margen de Seguridad: El nervio libera 4-5 veces más ACh de la necesaria.',
          ],
        },
        {
          id: 'safety-margin',
          title: 'Dinámica del Margen de Seguridad',
          titleEn: 'Synaptic Safety Factor Dynamics',
          content: `El margen de seguridad no es un valor fijo; varía dinámicamente durante la estimulación repetitiva. Entender esta dinámica es clave para interpretar la ENR.

**En personas sanas:**
Cuando estimulamos repetidamente a 2-3 Hz, el pool primario de vesículas se va agotando con cada estímulo. Después de 4-5 estímulos, la liberación de ACh puede caer hasta un 50% respecto al primer estímulo. Sin embargo, el margen de seguridad es tan amplio (4-5 veces) que incluso con esta caída, el EPP sigue estando MUY por encima del umbral. Por eso, en una ENR normal, la amplitud del CMAP (Potencial de Acción Muscular Compuesto) se mantiene estable, sin decremento.

**En Miastenia Gravis (defecto postsináptico):**
La pérdida de receptores nicotínicos reduce el EPP basal. Ahora el margen de seguridad es mucho menor, quizás solo 1.2 a 1.5 veces. Cuando el pool primario se agota con la estimulación repetitiva (misma caída del 50%), el EPP cae POR DEBAJO del umbral en algunas fibras musculares. Estas fibras dejan de contraerse (bloqueo individual). La pérdida progresiva de fibras se refleja como una caída de la amplitud del CMAP: el **decremento**.

**En Lambert-Eaton (defecto presináptico):**
Aquí el problema es diferente. La liberación basal de ACh ya es extremadamente baja (contenido cuántico reducido por el bloqueo de canales P/Q). El EPP basal apenas alcanza el umbral. Tras ejercicio intenso o estimulación de alta frecuencia, la acumulación masiva de Calcio residual en el terminal compensa parcialmente el defecto de los canales, aumentando espectacularmente la liberación de ACh. Esto se ve como un aumento de la amplitud del CMAP llamado **Facilitación** o **Incremento**.

**Tres factores que determinan el Margen de Seguridad:**
* **Factor Presináptico:** Cantidad de ACh liberada (contenido cuántico). Reducido en LEMS y Botulismo.
* **Factor Sináptico:** Actividad de la AChE. Modificado por inhibidores de colinesterasa.
* **Factor Postsináptico:** Densidad y función de los receptores ACh. Reducido en MG.`,
          clinicalPearls: [
            'El decremento en la ENR NO aparece hasta que una proporción significativa de fibras musculares individuales presenta bloqueo. Por eso la ENR tiene sensibilidad limitada (60-80%) comparada con el SFEMG (>95%).',
            'En un paciente con MG leve, un estudio normal de ENR NO descarta la enfermedad. El siguiente paso es SFEMG del orbicular del ojo o extensor común de los dedos.'
          ],
          keyPoints: [
            'Sano: El pool primario cae ~50% pero el EPP siempre supera el umbral (CMAP estable).',
            'MG: Margen reducido por pérdida de receptores. El EPP cae bajo umbral (decremento).',
            'LEMS: Liberación basal muy pobre. El Calcio residual post-ejercicio rescata la transmisión (facilitación).',
          ]
        }
      ]
    },
    {
      id: 'low-frequency-rns',
      title: 'ENR a Baja Frecuencia (MG)',
      children: [
        {
          id: 'standard-protocol',
          title: 'Protocolo Estándar (2-5 Hz)',
          content: `La ENR a baja frecuencia es el protocolo fundamental para evaluar trastornos postsinápticos como la Miastenia Gravis.

**Parámetros del estudio:**
* **Frecuencia:** 2-3 Hz (máximo 5 Hz). A esta velocidad, la depleción del pool primario supera la tasa de reposición desde el pool de movilización.
* **Número de estímulos:** Trenes de 6 a 10 estímulos supramáximos.
* **Intensidad:** 20-30% por encima de la supramáxima para asegurar que todos los axones se activen en cada pulso.
* **Temperatura cutánea:** Obligatoria entre 32°C y 35°C. El frío mejora artificialmente el margen de seguridad y puede dar un resultado falso negativo.

**Selección de músculos (de menor a mayor sensibilidad):**
* **Distales:** Nervio Cubital → Abductor del Dedo Meñique (ADM). Nervio Mediano → Abductor Pollicis Brevis (APB). Son los más fáciles de inmovilizar.
* **Proximales:** Nervio Espinal Accesorio → Trapecio. Nervio Facial → Nasalis. Son más sensibles pero más difíciles técnicamente.
* **Recomendación:** Iniciar en distales. Si son normales pero la sospecha clínica es alta, avanzar a proximales.

**Criterio de anormalidad:**
Se considera patológico un **decremento reproducible mayor del 10%** entre la amplitud del primer estímulo y el cuarto o quinto estímulo.

**El Patrón en "U" de la Miastenia Gravis:**
En la MG, la caída de amplitud es máxima alrededor del 4to estímulo, seguida de una estabilización o ligera recuperación hacia el 10mo estímulo. Esto ocurre porque el pool de movilización comienza a reponer parcialmente al pool primario. Esta forma de "U" es muy característica y ayuda a diferenciarlo de artefactos técnicos (donde la caída es lineal o errática).`,
          clinicalPearls: [
            'Un decremento del 8% NO es normal pero tampoco cumple el criterio estricto del 10%. En estos casos, la prueba debe repetirse con maniobras de ejercicio o en otro músculo antes de descartar MG.',
            'Si el paciente tiene miedo y tensa el músculo durante el estudio, puede aparecer un falso decremento por movimiento del electrodo. Asegúrate de que esté completamente relajado.',
          ],
          keyPoints: [
            'Frecuencia: 2-3 Hz, trenes de 6-10 estímulos supramáximos.',
            'Decremento patológico: mayor del 10% (del 1ro al 4to/5to estímulo).',
            'Patrón en U: Máxima caída en el 4to estímulo, recuperación parcial al 10mo.',
            'Temperatura cutánea obligatoria: 32-35°C.',
            'Músculos proximales (Trapecio, Nasalis) son más sensibles que los distales.'
          ]
        },
        {
          id: 'exercise-maneuvers',
          title: 'Maniobras de Ejercicio',
          content: `Las pruebas de ejercicio son herramientas fundamentales que modifican la disponibilidad de ACh y aumentan la sensibilidad del estudio.

**Reparación Post-ejercicio (Facilitación):**
* Se realiza un estudio basal de ENR a 2-3 Hz.
* Inmediatamente después, se pide al paciente ejercicio máximo isométrico por 10-30 segundos.
* Se repite la ENR dentro de los primeros 10 segundos tras el ejercicio.
* **Resultado esperado:** El decremento mejora o desaparece temporalmente. Esto ocurre porque el ejercicio intenso acumula Calcio residual en el terminal presináptico, aumentando la probabilidad de liberación (p) y por tanto el contenido cuántico (m).

**Agotamiento Post-ejercicio (Exhaustion):**
* Tras la facilitación, se repiten estudios de ENR cada 30-60 segundos durante 3-5 minutos.
* **Resultado esperado:** El decremento reaparece y se acentúa significativamente, superando al nivel basal. Esto ocurre porque el ejercicio prolongado agota progresivamente los tres pools de vesículas.
* **Importancia:** El momento de máxima sensibilidad para detectar MG leve es entre los 2 y 4 minutos post-ejercicio.`,
          clinicalPearls: [
            'La facilitación breve post-ejercicio puede normalizar un decremento que era claramente patológico en reposo. Por eso NUNCA debes hacer el estudio solamente después de ejercicio; siempre haz una línea base primero.',
            'Si solo haces la ENR en reposo y resulta normal, el agotamiento post-ejercicio puede revelar un defecto oculto; es el momento de máxima sensibilidad.'
          ],
          keyPoints: [
            'Facilitación: Mejora inmediata del decremento tras ejercicio breve (10-30 segundos).',
            'Agotamiento: Empeoramiento máximo del decremento a los 2-4 minutos post-ejercicio.',
            'Siempre obtener una línea base ANTES del ejercicio.',
          ]
        }
      ]
    },
    {
      id: 'high-frequency-rns',
      title: 'Trastornos Presinápticos (LEMS)',
      children: [
        {
          id: 'lems-protocol',
          title: 'Protocolo LEMS Clásico (Estimulación a 20-50 Hz)',
          content: `En los trastornos presinápticos como el Síndrome de Lambert-Eaton (LEMS), el defecto está en los canales de calcio tipo P/Q. La entrada de calcio está mermada, reduciendo masivamente la liberación basal de ACh, lo que produce un PAMC basal clásicamente muy bajo.

El protocolo clásico emplea la **estimulación repetitiva de alta frecuencia (20 a 50 Hz)** para forzar de forma masiva el ingreso de calcio:
* Se aplican estímulos rápidos continuos durante **5 a 10 segundos** (250-500 choques).
* Esto provoca un influjo de calcio que supera la capacidad de amortiguación celular y se acumula en el terminal, elevando la liberación de cuantos de ACh con cada estímulo.
* Fibras musculares bloqueadas se reactivan, causando una elevación dramática de amplitud y área del PAMC.

**Fórmula del incremento:**
Incremento (%) = [(Amplitud Máxima - Amplitud Inicial) / Amplitud Inicial] × 100

**Criterios diagnósticos:**
* **Incremento > 100%:** Hallazgo clásico y confirmatorio (diagnóstico definitivo de trastorno presináptico). A menudo en LEMS llega al 150-400% e incluso >2000%.
* **Incremento > 60%:** Aceptado históricamente como altamente sugestivo, especialmente si el PAMC basal es muy bajo y hay un decremento a baja frecuencia.
* **< 40%:** Normal o inespecífico.

**Limitación crítica:** La estimulación a 50 Hz es **extremadamente dolorosa** y los pacientes la toleran muy mal. Las guías actuales indican que esta técnica **solo debe reservarse para pacientes no colaboradores** (niños pequeños, sedados, intubados en UCI).`,
          clinicalPearls: [
            'Botulismo: También produce facilitación por bloqueo de proteínas SNARE, pero su incremento suele ser menor (30-100%) y clínicamente se asocia a compromiso autonómico precoz severo y parálisis flácida descendente.',
            'Un error común es intentar diagnosticar LEMS solo con estimulación lenta (3 Hz). A esa frecuencia, el LEMS produce el mismo "decremento" que la Miastenia Gravis, induciendo un diagnóstico erróneo catastrófico si no se hace facilitación.'
          ],
          keyPoints: [
            'Fórmula: ((PAMC final - PAMC inicial) / PAMC inicial) × 100.',
            'Criterio confirmatorio = Incremento > 100%.',
            'Reservado SOLO para pacientes sedados o que no pueden colaborar, por el dolor extremo.'
          ]
        },
        {
          id: 'exercise-test-short',
          title: 'Prueba de Ejercicio Corto (10s)',
          content: `Debido al extremo dolor de la estimulación a 50 Hz, la **prueba de ejercicio corto (contracción de 10 segundos)** es la técnica de elección (gold standard) para la facilitación presináptica. Aprovecha la activación voluntaria del paciente para inundar el terminal de calcio sin provocar dolor.

**Técnica de Contracción Isométrica Máxima:**
1.  **Línea base indispensable:** Se estimula el nervio en reposo absoluto (PAMC basal).
2.  Se pide al paciente **contracción voluntaria isométrica máxima durante exactamente 10 segundos** contra resistencia firme. (Isométrica evita el desplazamiento del electrodo).
3.  Inmediatamente después de soltar (antes de que pasen 10 segundos), se da **un único choque supramáximo**.
4.  Se mide el PAMC post-ejercicio y se aplica la fórmula del incremento.

Fisiológicamente, 10 segundos de contracción máxima equivalen a la estimulación nerviosa repetitiva de alta frecuencia. En un paciente con LEMS, se producirá la misma movilización inmediata masiva de acetilcolina.

**Diferenciación de Pseudo-facilitación:**
En sujetos sanos, un ejercicio máximo puede sincronizar temporalmente las fibras musculares originando un aumento en la amplitud del PAMC de hasta un 40% (pseudofacilitación fisiológica).
Sin embargo, en la pseudofacilitación el **área** del potencial se mantiene igual o incluso disminuye. En la verdadera facilitación presináptica del LEMS, **tanto la amplitud como el área** crecen dramáticamente por encima del 100%.`,
          clinicalPearls: [
            'El paciente debe estar completamente relajado antes de obtener la línea basal. Si está discretamente tenso, se estará auto-facilitando sin darte cuenta, lo que elevará tu línea base y te arruinará el cálculo del incremento (falso negativo).',
            'El reloj es vital: Si te demoras 30-40 segundos en estimular después de que el paciente se relaje, habrás perdido la ventana y el calcio ya se habrá recapitulado. Tienes que estimular de inmediato.'
          ],
          keyPoints: [
            'Alternativa de elección, totalmente indolora.',
            'Contracción isométrica máxima por exactamente 10 segundos.',
            'Estímulo post-ejercicio inmediato (< 10 segundos).',
            'Facilitación real = Aumento de amplitud Y de área.'
          ]
        }
      ]
    },
    {
      id: 'rns-pitfalls',
      title: 'Perlas y Errores Técnicos',
      children: [
        {
          id: 'standard-pitfalls',
          title: 'Errores comunes y cómo evitarlos',
          content: `La ENR es uno de los estudios más técnicamente exigentes en electrodiagnóstico. Los errores más comunes pueden producir tanto falsos positivos como falsos negativos.

**Pseudo-decremento por movimiento (Error más frecuente):**
* Si el electrodo de registro se desplaza aunque sea 1-2 milímetros durante el tren de estímulos, la amplitud cae progresivamente simulando un defecto de la UNM.
* **Prevención:** Inmovilización estricta del segmento explorado con cinta adhesiva firme. Fijar tanto el electrodo de registro como el estimulador. Usar férulas si es necesario.
* **Cómo detectarlo:** En un decremento real (MG), la morfología del CMAP se mantiene idéntica en todos los pulsos. En un pseudo-decremento por movimiento, la forma del CMAP cambia de un pulso a otro.

**Estimulación submáxima:**
* Si la intensidad del estímulo es inconsistente (por ejemplo, el estimulador se mueve levemente), algunos axones no se activan en todos los pulsos, produciendo un falso decremento.
* **Prevención:** Usar siempre intensidad 20-30% por encima de la supramáxima. Fijar firmemente el estimulador.

**Efecto de la temperatura:**
* El frío mejora el margen de seguridad al prolongar la apertura de los canales de sodio y ralentizar la degradación de ACh por la AChE. Esto puede normalizar un decremento que sería patológico a temperatura adecuada.
* **Prevención:** Medir la temperatura cutánea antes de cada estudio. Si es menor de 32°C, calentar la extremidad.

**Efecto de medicamentos:**
* Los inhibidores de la colinesterasa (Piridostigmina/Mestinon) pueden normalizar un estudio en MG leve al prolongar la vida de la ACh en la hendidura.
* **Protocolo:** Si es clínicamente seguro, suspender la piridostigmina 12-24 horas antes del estudio.
* **Importante:** Si el paciente NO puede suspender la medicación, un resultado negativo no descarta MG, pero un resultado positivo sigue siendo válido.`,
          clinicalPearls: [
            '**Regla de oro:** Si el CMAP cambia de forma entre pulsos, sospecha movimiento del electrodo. En un decremento real por MG, la forma es idéntica; solo cambia la amplitud.',
            'Cuando tengas duda sobre si un decremento del 10-12% es real o artefacto, repite el estudio 3 veces en la misma posición. Un decremento verdadero es reproducible.',
          ],
          keyPoints: [
            'Inmovilización estricta es el factor más crítico para evitar falsos positivos.',
            'Temperatura cutánea mayor de 32°C en todo estudio de ENR.',
            'Intensidad de estimulación: 20-30% supra-máxima.',
            'Suspender Piridostigmina 12-24h antes si es clínicamente seguro.',
            'Si la morfología del CMAP cambia entre pulsos = artefacto de movimiento, no MG.',
          ]
        }
      ]
    }
  ]
};
