// src/content/modules/module-01-fundamentals.ts
import { Module } from '../../types/content';

export const module01: Module = {
  id: 'fundamentals',
  number: 1,
  title: 'Fundamentos de Neurofisiología Clínica',
  titleEn: 'Clinical Neurophysiology Fundamentals',
  emoji: '📘',
  description: 'Bases de electricidad, neuroanatomía funcional y fisiología de la contracción muscular',
  descriptionEn: 'Electrical principles, functional neuroanatomy, and muscle contraction physiology',
  color: 'from-blue-500 to-blue-700',
  icon: 'BookOpen',
  topics: [
    {
      id: 'intro-neurodiagnostics',
      title: 'Introducción al Neurodiagnóstico',
      titleEn: 'Introduction to Neurodiagnostics',
      description: 'Historia, rol clínico y ética del electrodiagnóstico',
      children: [
        { id: 'history', title: 'Historia de la electrofisiología clínica', titleEn: 'History of clinical electrophysiology',
          content: `La electrofisiología clínica tiene sus raíces en los experimentos pioneros de Luigi Galvani en 1791, quien demostró que la estimulación eléctrica de los nervios de las ancas de rana producía contracción muscular, estableciendo el concepto de "electricidad animal".

En 1929, Edgar Adrian y Detlev Bronk desarrollaron el primer electrodo de aguja concéntrica capaz de registrar la actividad de una sola unidad motora, lo que marcó el nacimiento de la electromiografía clínica moderna. Fritz Buchthal, en las décadas de 1950-1960, estandarizó los valores normales de los potenciales de acción de unidad motora (PAUM) por músculo y edad.

La neuroconducción se consolidó con los trabajos de Hodes, Larrabee y German (1948) midiendo velocidades de conducción en nervios humanos. La estimulación nerviosa repetitiva para trastornos de unión neuromuscular fue desarrollada por Harvey y Masland (1941). Erik Stålberg introdujo la EMG de fibra única (SFEMG) en los años 1960, permitiendo medir el jitter neuromuscular con precisión sin precedentes.

En la era moderna, los equipos digitales con análisis automático de potenciales, software de descomposición de señales y la integración con ecografía neuromuscular han expandido enormemente las capacidades diagnósticas del laboratorio de electrodiagnóstico.`,
          clinicalPearls: [
            'El primer electrodo de aguja concéntrica (Adrian & Bronk, 1929) sigue siendo el tipo de electrodo más utilizado en la práctica clínica actual.',
            'La obra de Buchthal sobre valores normales de PAUM por músculo y edad sigue siendo la referencia estándar más de 60 años después.',
          ],
          keyPoints: [
            'Galvani (1791): descubrimiento de la electricidad animal.',
            'Adrian y Bronk (1929): primer electrodo de aguja concéntrica.',
            'Buchthal (1950-60): estandarización de valores normales de PAUM.',
            'Stålberg (1960s): invención de la EMG de fibra única (SFEMG).',
            'Era moderna: equipos digitales, análisis automático y ecografía neuromuscular.',
          ],
          youtubeUrls: [
            { title: 'Historia de la Electromiografía', videoId: 'dPHnBPXRQxc' },
          ],
        },
        { id: 'clinical-role', title: 'Rol del electrodiagnóstico en medicina', titleEn: 'Role of electrodiagnostics in medicine',
          content: `Los estudios de electrodiagnóstico (EDx) constituyen una extensión del examen neurológico que proporciona datos objetivos y cuantitativos sobre la función del sistema nervioso periférico y muscular. No son un estudio aislado, sino que deben interpretarse siempre en el contexto de la historia clínica y el examen físico.

Las funciones principales del EDx incluyen:

• Localización anatómica de la lesión: permite distinguir entre patología de raíz nerviosa, plexo, nervio periférico, unión neuromuscular o músculo.
• Determinación de la fisiopatología: diferencia procesos axonales (pérdida de amplitud) de desmielinizantes (enlentecimiento, bloqueos de conducción).
• Estimación de severidad: cuantifica el grado de pérdida axonal o disfunción desmielinizante.
• Estimación pronóstica: predice la recuperación funcional basándose en el tipo y grado de lesión.
• Guía terapéutica: orienta decisiones quirúrgicas (ej. descompresión en STC severo) o médicas (ej. IVIg en CIDP).

El electrodiagnóstico incluye tres componentes principales: estudios de conducción nerviosa (NCS), electromiografía de aguja (EMG) y pruebas especiales (ENR, SFEMG, potenciales evocados). Un estudio completo típicamente combina NCS y EMG de forma secuencial, adaptando el protocolo según la pregunta clínica.`,
          clinicalPearls: [
            'Siempre adapta el protocolo EDx a la pregunta clínica específica. Un estudio "de rutina" sin hipótesis clínica tiene bajo rendimiento diagnóstico.',
            'El EDx es una extensión del examen neurológico, NO un sustituto. El examen físico previo es obligatorio.',
          ],
          keyPoints: [
            'El EDx localiza lesiones: raíz, plexo, nervio, UNM o músculo.',
            'Diferencia fisiopatología: axonal vs. desmielinizante.',
            'Estima severidad, pronóstico y guía decisiones terapéuticas.',
            'Los tres componentes son: NCS, EMG de aguja y pruebas especiales.',
          ],
        },
        { id: 'laboratory', title: 'El laboratorio de neurofisiología: equipamiento y bioseguridad', titleEn: 'Neurophysiology laboratory: equipment and biosafety',
          content: `Un laboratorio de electrodiagnóstico moderno requiere equipamiento especializado, un ambiente controlado y estrictas normas de bioseguridad.

**Equipamiento esencial:**
• Equipo de EMG/NCS con amplificador diferencial de alta ganancia (CMRR ≥100 dB).
• Estimulador eléctrico con control preciso de intensidad (0-100 mA) y duración del estímulo (0.05-1.0 ms).
• Altavoz de alta fidelidad (el sonido es crucial para identificar actividad espontánea).
• Monitor de visualización con resolución suficiente para medir latencias y amplitudes.
• Electrodos: de superficie (disco, barra, anillo) y de aguja (concéntrica, monopolar, fibra única).
• Termómetro infrarrojo o de contacto para medir temperatura cutánea.
• Gel conductor, pasta abrasiva, alcohol al 70%, guantes no estériles.
• Contenedor rígido para punzocortantes y bolsas para residuos biológico-infecciosos (RPBI).

**Condiciones ambientales:**
La sala debe mantener una temperatura ambiente de 22-25°C para minimizar el enfriamiento de extremidades. Debe contar con toma de tierra (ground) adecuada y minimizar fuentes de interferencia electromagnética (alejarse de motores eléctricos, camas eléctricas, bombas de infusión).

**Bioseguridad:**
Se deben seguir precauciones estándar universales: uso de guantes para todo procedimiento invasivo, agujas desechables de un solo uso (nunca reutilizar), disposición inmediata en contenedor de punzocortantes, limpieza de superficies entre pacientes, y lavado de manos antes y después de cada estudio.`,
          clinicalPearls: [
            'El altavoz es tan importante como la pantalla: muchos hallazgos patológicos se identifican primero por el sonido (fibrilaciones = "lluvia", miotonía = "bombardero en picada").',
            'Mantén la temperatura ambiente a 22-25°C y calienta las extremidades ANTES del estudio para evitar falsos positivos de desmielinización.',
          ],
          keyPoints: [
            'Equipo básico: amplificador diferencial, estimulador, altavoz, electrodos.',
            'Temperatura ambiente óptima: 22-25°C.',
            'Agujas son SIEMPRE desechables y de un solo uso.',
            'Precauciones estándar universales obligatorias.',
          ],
        },
        { id: 'ethics', title: 'Ética y prevención cuaternaria en electrodiagnóstico', titleEn: 'Ethics and quaternary prevention',
          content: `La ética en electrodiagnóstico se rige por los mismos principios bioéticos fundamentales que toda la práctica médica: beneficencia, no maleficencia, autonomía y justicia. Sin embargo, el EDx tiene consideraciones particulares por su naturaleza invasiva y potencialmente dolorosa.

**Prevención cuaternaria:**
Concepto desarrollado por Marc Jamouille, se refiere a las acciones tomadas para evitar exponer al paciente a estudios innecesarios o potencialmente dañinos. En EDx esto implica:
• No realizar estudios sin una indicación clínica clara basada en la historia y el examen neurológico.
• No solicitar estudios "de rutina" sin hipótesis diagnóstica.
• Evitar la repetición innecesaria de estudios recientes.
• Limitar la extensión del estudio a lo clínicamente relevante.

**Consentimiento informado:**
El paciente debe ser informado sobre: el propósito del estudio, la descripción del procedimiento (incluyendo que involucra estimulación eléctrica y/o inserción de agujas), las molestias esperadas, los riesgos (hematoma, infección, neumotórax en músculos torácicos), y las alternativas diagnósticas.

**Reporte de resultados:**
El informe debe ser claro, conciso, evitar ambigüedades, reportar hallazgos con honestidad (incluyendo estudios normales), correlacionar con la clínica y evitar diagnósticos fuera del alcance del estudio.`,
          clinicalPearls: [
            'El mejor electrodiagnóstico es aquel que responde una pregunta clínica específica con el mínimo de molestias para el paciente.',
            'Un estudio electrodiagnóstico normal es un resultado válido e importante: descarta patologías graves y reorienta el diagnóstico.',
          ],
          keyPoints: [
            'Prevención cuaternaria: evitar estudios innecesarios o dañinos.',
            'Consentimiento informado obligatorio: explicar procedimiento, molestias y riesgos.',
            'El método clínico guía la indicación, no la disponibilidad del equipo.',
            'Reportar hallazgos con honestidad, incluyendo estudios normales.',
          ],
        },
      ]
    },
    {
      id: 'electricity-basics',
      title: 'Bases de Electricidad y Electrónica',
      titleEn: 'Electrical and Electronic Basics',
      description: 'Principios eléctricos aplicados al electrodiagnóstico',
      children: [
        { id: 'voltage-current', title: 'Principios de electricidad: voltaje, corriente, resistencia', titleEn: 'Electricity principles',
          content: `Los tres conceptos fundamentales de electricidad son esenciales para entender cómo funcionan los equipos de electrodiagnóstico y cómo se generan las señales bioeléctricas.

**Voltaje (V):** Es la diferencia de potencial eléctrico entre dos puntos, medido en voltios. En el cuerpo humano, el potencial de reposo de una membrana axonal es de aproximadamente -70 a -90 mV. Durante un potencial de acción, el voltaje se invierte transitoriamente a +30 mV.

**Corriente (I):** Es el flujo de carga eléctrica a través de un conductor, medido en amperios. En los tejidos biológicos, la corriente es transportada por iones (Na+, K+, Cl-, Ca2+), no por electrones.

**Resistencia (R):** Es la oposición al flujo de corriente, medida en ohmios (Ω). La Ley de Ohm establece la relación: V = I × R.

En electrodiagnóstico trabajamos con señales extremadamente pequeñas: los SNAP son del orden de 5-80 µV y los CMAP de 2-20 mV. El estimulador eléctrico utiliza corrientes de 0-100 mA con duraciones de 0.05-1.0 ms para despolarizar los nervios.`,
          clinicalPearls: [
            'Los SNAP son 1,000 veces más pequeños que los CMAP. Por eso los sensitivos son mucho más susceptibles al ruido y requieren promediación (averaging).',
            'La impedancia de la piel actúa como una resistencia al paso de la corriente del estimulador. Limpiar la piel con alcohol reduce esta resistencia.'
          ],
          keyPoints: [
            'Voltaje = diferencia de potencial (presión eléctrica).',
            'Corriente = flujo de carga (movimiento de iones).',
            'Resistencia = oposición al flujo (Ley de Ohm: V=IR).',
            'Señales biológicas: SNAP (μV) << CMAP (mV).'
          ],
          youtubeUrls: [
            { title: 'Fundamentos de Electricidad y Bioelectricidad', videoId: 'vjFefDCIje0' }
          ]
        },
        { id: 'differential-amplification', title: 'Amplificación diferencial', titleEn: 'Differential amplification',
          content: `El amplificador diferencial es el corazón de todo equipo de electrodiagnóstico. Su función es registrar la diferencia de potencial entre dos electrodos (denominados G1 o activo y G2 o referencia), rechazando simultáneamente cualquier señal que sea idéntica en ambos electrodos (ruido de modo común).

**Principio de funcionamiento:**
Si G1 registra señal A y G2 registra señal B, el amplificador muestra: A - B. El ruido ambiental (interferencia electromagnética de 60 Hz, equipos eléctricos) llega igualmente a ambos electrodos, por lo que se cancela: Ruido - Ruido = 0.

**Electrodos:**
• **G1 (Activo):** Se coloca sobre el músculo o nervio de interés (vientre muscular o punto de registro del nervio sensitivo).
• **G2 (Referencia):** Se coloca en un sitio eléctricamente inactivo (tendón distal, hueso).
• **Ground (Tierra):** Electrodo de tierra colocado entre el estimulador y el electrodo de registro para drenar corrientes de fuga.

Si la ubicación del electrodo activo es incorrecta (fuera del punto motor), se obtendrá un potencial con deflexión inicial positiva, indicando que la señal se propaga HACIA el electrodo en lugar de originarse debajo de él.`,
          clinicalPearls: [
            'Una deflexión inicial positiva en el CMAP indica electrodo activo mal posicionado. Reubica G1 sobre el punto motor del músculo.',
            'El electrodo de tierra (ground) SIEMPRE debe colocarse entre el estimulador y los electrodos de registro para minimizar artefacto de estímulo.',
          ],
          keyPoints: [
            'Amplificador diferencial: registra A - B, rechazando ruido común.',
            'G1 (activo): sobre punto motor o nervio. G2 (referencia): sitio inactivo.',
            'Ground: entre estimulador y registro.',
            'Deflexión inicial positiva = electrodo mal posicionado.',
          ],
        },
        { id: 'filters', title: 'Filtros: pasa-bajos, pasa-altos, notch', titleEn: 'Filters: low-pass, high-pass, notch',
          content: `Los filtros son componentes esenciales que permiten aislar las señales bioeléctricas de interés eliminando frecuencias no deseadas.

**Filtro pasa-bajos (Low-pass):** Permite el paso de frecuencias por debajo de un umbral y atenúa las superiores. Para EMG de aguja se usa típicamente 10 kHz; para NCS motora 10 kHz. Su función principal es eliminar ruido de alta frecuencia.

**Filtro pasa-altos (High-pass):** Permite el paso de frecuencias por encima de un umbral y atenúa las inferiores. Para EMG de aguja: 10-20 Hz; para NCS sensitiva: 20 Hz; para NCS motora: 2 Hz. Elimina la línea base errante y el movimiento.

**Filtro Notch (Banda eliminada):** Elimina selectivamente la frecuencia de la red eléctrica (50 Hz en Europa/Latinoamérica, 60 Hz en EE.UU./México). **PRECAUCIÓN:** El uso del filtro notch puede distorsionar las amplitudes de los potenciales y no debe usarse rutinariamente para CMAP. Solo activarlo cuando la interferencia de línea no se puede resolver con otras medidas (mejorar tierra, reducir impedancia, alejar fuentes de ruido).

**Efecto de los filtros en los potenciales:**
• Aumentar el filtro pasa-altos: reduce la amplitud y acorta la duración del potencial.
• Disminuir el filtro pasa-bajos: suaviza el potencial, reduce amplitud y prolonga la latencia.`,
          clinicalPearls: [
            'NUNCA uses el filtro notch como primera línea para eliminar interferencia de 60 Hz. Primero corrige la impedancia (limpiar piel, gel), verifica la tierra, y aleja equipos eléctricos.',
            'Cambiar los filtros durante el estudio altera las mediciones. Usa siempre los mismos ajustes estándar para poder comparar con valores normativos.',
          ],
          keyPoints: [
            'Pasa-bajos: elimina ruido de alta frecuencia (10 kHz típico).',
            'Pasa-altos: elimina línea base errante (2-20 Hz típico).',
            'Notch: elimina 50/60 Hz — usar con precaución, distorsiona amplitudes.',
            'Cambiar filtros altera amplitudes, latencias y duración de los potenciales.',
          ],
        },
        { id: 'impedance', title: 'Impedancia de electrodos', titleEn: 'Electrode impedance',
          content: `La impedancia es la oposición total al flujo de corriente alterna en un circuito, incorporando tanto resistencia como reactancia (capacitiva e inductiva). En electrodiagnóstico, la impedancia del electrodo-piel es el factor más importante que determina la calidad de los registros.

**Valores objetivo:**
La impedancia debe mantenerse por debajo de 5-10 kΩ para obtener registros de alta calidad. El balance de impedancia entre G1, G2 y tierra debe ser similar (<1 kΩ de diferencia) para maximizar el rechazo de modo común (CMRR).

**Factores que aumentan la impedancia:**
• Piel seca, grasa, sudor excesivo o cremas.
• Electrodo mal adherido o con gel insuficiente.
• Vello corporal abundante.
• Edema o tejido subcutáneo grueso.

**Cómo reducir la impedancia:**
• Limpiar la piel con alcohol al 70%.
• Frotar suavemente con pasta abrasiva (NuPrep® o equivalente).
• Aplicar gel conductor suficiente.
• Asegurar contacto firme del electrodo con la piel.
• Rasurar si hay vello excesivo.`,
          clinicalPearls: [
            'Si un SNAP no se puede obtener, antes de declararlo "ausente", verifica la impedancia. Una impedancia alta puede enterrar la señal en el ruido.',
            'El desequilibrio de impedancia entre G1 y G2 (>1 kΩ de diferencia) reduce dramáticamente el CMRR y aumenta el ruido.',
          ],
          keyPoints: [
            'Impedancia objetivo: <5-10 kΩ.',
            'Balance entre electrodos: <1 kΩ de diferencia.',
            'Preparación: alcohol + abrasión + gel conductor.',
            'Impedancia alta = más ruido = potenciales de peor calidad.',
          ],
        },
        { id: 'signal-noise-cmrr', title: 'Relación señal/ruido y CMRR', titleEn: 'Signal-to-noise ratio and CMRR',
          content: `La relación señal/ruido (SNR, Signal-to-Noise Ratio) es la medida fundamental de la calidad de un registro electrodiagnóstico. Indica qué tan bien se distingue la señal biológica del ruido de fondo.

**Fuentes de ruido:**
• Interferencia de línea eléctrica (50/60 Hz): la más común.
• Ruido electromagnético de equipos médicos (bombas de infusión, camas eléctricas, lámparas fluorescentes).
• Artefacto de movimiento del paciente o del cable.
• Ruido intrínseco del amplificador (inevitable pero mínimo en equipos modernos).

**CMRR (Common Mode Rejection Ratio):**
El CMRR cuantifica la capacidad del amplificador diferencial para rechazar señales idénticas en ambos electrodos. Se expresa en decibelios (dB).
• CMRR típico de equipos modernos: ≥100 dB (100,000:1).
• Esto significa que una señal de modo común de 1 V se reduce a solo 10 µV en la salida.

**Cómo mejorar el SNR:**
• Reducir impedancia (preparación de piel).
• Promediación (averaging): mejora el SNR proporcionalmente a la raíz cuadrada del número de repeticiones — si promedias 100 estímulos, el SNR mejora ×10.
• Usar filtros apropiados.
• Ambiente eléctrico limpio.`,
          clinicalPearls: [
            'La promediación (averaging) mejora el SNR proporcionalmente a √n. Para mejorar el SNR al doble, necesitas 4 veces más repeticiones, no el doble.',
            'Para estudios sensitivos (SNAP), promediar al menos 10-20 trazos es mandatorio. Para CMAP, generalmente un solo trazo es suficiente.',
          ],
          keyPoints: [
            'SNR alto = mejor registro. Depende de impedancia, ruido y amplificación.',
            'CMRR ≥100 dB es estándar en equipos modernos.',
            'Averaging mejora SNR proporcionalmente a √n.',
            'Preparación de piel + ambiente limpio = mejor calidad de señal.',
          ],
        },
        { id: 'digitalization', title: 'Digitalización y muestreo de señales', titleEn: 'Signal digitalization and sampling',
          content: `Las señales bioeléctricas son analógicas (continuas en el tiempo), pero los equipos modernos las convierten a formato digital para almacenamiento, procesamiento y análisis.

**Conversor analógico-digital (A/D):**
Trasforma el voltaje continuo en valores numéricos discretos. La resolución se mide en bits: un conversor de 16 bits puede representar 65,536 niveles diferentes de voltaje, lo cual es más que suficiente para señales de EMG.

**Frecuencia de muestreo:**
Debe cumplir el **Teorema de Nyquist**: la frecuencia de muestreo debe ser al menos el doble de la frecuencia máxima de la señal. En la práctica:
• Señales de EMG (frecuencias hasta 10 kHz): muestrear a ≥20 kHz.
• Señales de NCS (frecuencias hasta 10 kHz): muestrear a ≥20 kHz.
• Si la frecuencia de muestreo es insuficiente, se produce **aliasing**: la señal digital no representa fielmente la señal original, causando artefactos y distorsión.

**Ventajas de la digitalización:**
• Almacenamiento permanente de datos.
• Análisis cuantitativo automático (medición de amplitudes, latencias, áreas).
• Promediación digital (averaging) para mejorar el SNR.
• Análisis de descomposición de potenciales de unidad motora.
• Tele-electrodiagnóstico y consulta remota.`,
          clinicalPearls: [
            'Un equipo con baja frecuencia de muestreo puede perder picos de amplitud y subestimar las velocidades de conducción. Verifica que tu equipo muestree a ≥20 kHz.',
            'El aliasing es un artefacto sutil: la señal parece normal pero las mediciones son incorrectas. Es prevenible usando frecuencias de muestreo adecuadas.',
          ],
          keyPoints: [
            'Conversor A/D: transforma señal analógica a digital.',
            'Teorema de Nyquist: frecuencia de muestreo ≥ 2× frecuencia máxima de la señal.',
            'EMG/NCS: muestrear a ≥20 kHz.',
            'Aliasing: artefacto por submuestreo, produce mediciones erróneas.',
          ],
        },
      ]
    },
    {
      id: 'functional-neuroanatomy',
      title: 'Neuroanatomía Funcional',
      titleEn: 'Functional Neuroanatomy',
      description: 'Arquitectura de la neurona motora, axón periférico, fibras y unidad motora',
      children: [
        {
          id: 'motor-neuron-architecture',
          title: 'Arquitectura de la neurona motora',
          titleEn: 'Motor neuron architecture',
          children: [
            { id: 'soma-dendrites-axon', title: 'Soma, dendritas, axón, terminales sinápticas', titleEn: 'Soma, dendrites, axon, synaptic terminals',
              content: `La neurona motora inferior (motoneurona alfa) es la vía final común del sistema motor. Su estructura se divide en cuatro regiones funcionales:

**Soma (cuerpo celular):** Localizado en el asta anterior de la médula espinal (lámina IX de Rexed). Contiene el núcleo y es el centro integrador de señales excitatorias e inhibitorias.

**Dendritas:** Múltiples ramificaciones que reciben input sináptico de interneuronas, vías piramidales y aferencias sensoriales. La integración de miles de sinapsis determina si la motoneurona dispara.

**Axón:** Un único axón largo y mielinizado que emerge del cono axonal, viaja por la raíz ventral, se integra en el plexo y recorre el nervio periférico hasta el músculo. Su diámetro (12-20 µm para las α) determina la velocidad de conducción.

**Terminales sinápticas:** El axón se ramifica en múltiples terminales que forman la unión neuromuscular (UNM) con las fibras musculares esqueléticas. Cada terminal contiene vesículas de acetilcolina.`,
              clinicalPearls: [
                'En enfermedades de motoneurona (ELA), la degeneración del soma produce denervación progresiva. Las motoneuronas sobrevivientes reinvervan fibras huérfanas, produciendo PAUM grandes y polifásicos.',
                'El cono axonal es el sitio de menor umbral donde se inicia el potencial de acción.',
              ],
              keyPoints: [
                'Motoneurona α: soma en asta anterior, axón largo mielinizado, terminales en UNM.',
                'Diámetro axonal (12-20 µm) determina la velocidad de conducción.',
                'La EMG registra la actividad originada en esta unidad funcional.',
              ],
            },
            { id: 'umn-vs-lmn', title: 'Neurona motora superior vs. inferior', titleEn: 'Upper vs. lower motor neuron',
              content: `La distinción entre neurona motora superior (UMN) e inferior (LMN) es uno de los conceptos más fundamentales en neurología y electrodiagnóstico.

**Neurona motora superior (UMN):**
Origina en la corteza motora primaria. Su axón desciende por la cápsula interna, pedúnculos cerebrales y tracto corticoespinal (vía piramidal), decusando en las pirámides bulbares.

**Signos de lesión UMN:** Espasticidad, hiperreflexia, clonus, Babinski positivo, pérdida del control fino. **NO hay atrofia temprana ni fasciculaciones.**

**Neurona motora inferior (LMN):**
Soma en asta anterior → raíz ventral → plexo → nervio periférico → UNM → músculo.

**Signos de lesión LMN:** Atrofia muscular, fasciculaciones, hiporreflexia/arreflexia, hipotonía, debilidad flácida. Las fibrilaciones en EMG documentan denervación activa.

**La EMG evalúa directamente solo la LMN y el músculo.** No puede evaluar la UMN directamente.`,
              clinicalPearls: [
                'En ELA coexisten signos de UMN y LMN. La EMG documenta los signos de LMN; los signos de UMN deben documentarse clínicamente.',
                'EMG no puede diagnosticar lesiones de UMN aisladas.',
              ],
              keyPoints: [
                'UMN: corteza → médula. Lesión causa espasticidad, hiperreflexia, Babinski.',
                'LMN: asta anterior → músculo. Lesión causa atrofia, fasciculaciones, hiporreflexia.',
                'EMG evalúa directamente solo LMN y músculo.',
                'ELA: coexistencia de signos UMN + LMN.',
              ],
            },
          ]
        },
        {
          id: 'peripheral-axon',
          title: 'El axón periférico',
          titleEn: 'The peripheral axon',
          children: [
            { id: 'axonal-membrane', title: 'Membrana axonal y canales iónicos', titleEn: 'Axonal membrane and ion channels', content: 'La membrana del axón contiene canales de Na+ dependientes de voltaje (concentrados en los nódulos de Ranvier) y canales de K+ (en las regiones paranodales e internodales). El potencial de reposo (-70 a -90 mV) se mantiene por la bomba Na+/K+-ATPasa.' },
            { id: 'myelin-sheath', title: 'Vaina de mielina y células de Schwann', titleEn: 'Myelin sheath and Schwann cells', content: 'Las células de Schwann envuelven el axón periférico formando la vaina de mielina, un aislante eléctrico que permite la conducción saltatoria. Cada célula de Schwann mieliniza un solo segmento internodal. Las fibras mielinizadas tienen velocidades de conducción de 40-70 m/s, mientras que las amielínicas conducen a 0.5-2 m/s.' },
            { id: 'nodes-saltatory', title: 'Nódulos de Ranvier y conducción saltatoria', titleEn: 'Nodes of Ranvier and saltatory conduction', content: 'Los nódulos de Ranvier son las brechas entre segmentos de mielina donde los canales de Na+ están concentrados. La conducción saltatoria "salta" de nódulo a nódulo, permitiendo velocidades de conducción altas con menor gasto energético. La desmielinización interrumpe este mecanismo, causando enlentecimiento o bloqueo de la conducción.' },
            { id: 'wallerian-degeneration', title: 'Degeneración Walleriana y regeneración axonal', titleEn: 'Wallerian degeneration and axonal regeneration', content: 'Tras una lesión axonal, la porción distal del axón degenera (degeneración Walleriana) en 7-11 días. Los tubos endoneurales vacíos pueden guiar la regeneración, que ocurre a ~1 mm/día (o 1 pulgada/mes). Las fibrilaciones aparecen en EMG 2-3 semanas después de la denervación.' },
          ]
        },
        {
          id: 'nerve-fiber-classification',
          title: 'Clasificación de fibras nerviosas',
          titleEn: 'Nerve fiber classification',
          children: [
            { id: 'fiber-types', title: 'Fibras Aα, Aβ, Aδ, B y C', titleEn: 'Fiber types Aα, Aβ, Aδ, B and C', content: 'Aα: mielinizadas gruesas (12-20 µm), propiocepción y motoras somáticas, 70-120 m/s. Aβ: mielinizadas medias (5-12 µm), tacto discriminativo y presión, 30-70 m/s. Aδ: mielinizadas finas (2-5 µm), dolor agudo y temperatura, 12-30 m/s. B: mielinizadas finas, autónomas preganglionares, 3-15 m/s. C: amielínicas (0.3-1.3 µm), dolor lento, temperatura, autónomas postganglionares, 0.5-2 m/s.' },
            { id: 'cv-by-fiber', title: 'Velocidades de conducción por tipo de fibra', titleEn: 'Conduction velocities by fiber type',
              content: `La velocidad de conducción (VC) está determinada por el diámetro del axón y el grado de mielinización. La relación es aproximadamente: VC (m/s) ≈ 6 × diámetro (µm) para fibras mielinizadas.

**Relación diámetro-velocidad:**
• 20 µm → ~120 m/s (motoneurona α gruesa)
• 12 µm → ~70 m/s (fibra Aα delgada)
• 6 µm → ~36 m/s (fibra Aβ)
• 3 µm → ~18 m/s (fibra Aδ)
• 1 µm amielínica → ~1 m/s (fibra C)

**Factores que modifican la VC:**
• **Temperatura:** Disminuye ~1.5-2 m/s por cada °C debajo de 33°C. Es el artefacto más común.
• **Edad:** Disminuye ~1-2 m/s por década después de los 60 años.
• **Desmielinización patológica:** Reduce VC por debajo del 70% del límite inferior normal (LIN).
• **Pérdida axonal selectiva:** La pérdida de fibras gruesas reduce las VC máximas, pero suele quedar entre 70-80% del LIN.`,
              clinicalPearls: [
                'VC <70% del LIN en ≥2 nervios es un criterio electrodiagnóstico de desmielinización (criterio para CIDP).',
                'Una VC levemente reducida (70-80% LIN) puede deberse a pérdida axonal de fibras gruesas, no necesariamente a desmielinización.',
              ],
              keyPoints: [
                'VC ≈ 6 × diámetro (µm) para fibras mielinizadas.',
                'Temperatura: -1.5 a -2 m/s por cada °C <33°C.',
                'VC <70% LIN: criterio de desmielinización.',
              ],
            },
            { id: 'clinical-correlation', title: 'Correlación clínica de cada grupo de fibras', titleEn: 'Clinical correlation of each fiber group',
              content: `Comprender qué tipo de fibra se afecta en cada patología permite dirigir el estudio electrodiagnóstico de forma racional.

**Fibras gruesas mielinizadas (Aα, Aβ):**
• Evaluadas por NCS convencionales (CMAP y SNAP).
• Afectación causa: debilidad (Aα motoras), pérdida de tacto fino, propiocepción y vibración (Aβ), ataxia sensitiva, Romberg positivo.
• Patologías: CIDP, GBS, anti-MAG, neuropatía por déficit de B12.

**Fibras finas (Aδ, C):**
• NO evaluadas por NCS convencionales.
• Afectación causa: dolor neuropático (quemazón, alodinia), pérdida de temperatura, disfunción autonómica.
• Se evalúan: biopsia de piel (IENFD), QST, potenciales evocados por láser.
• Patologías: neuropatía de fibra fina (diabetes temprana, amiloidosis, Fabry, idiopática).

**Un NCS normal NO descarta neuropatía** si solo se afectan fibras finas.`,
              clinicalPearls: [
                'NCS normales + dolor neuropático = sospecha de neuropatía de fibra fina. Solicitar biopsia de piel.',
                'Las fibras gruesas se afectan primero en GBS/CIDP; las finas se afectan primero en diabetes y amiloidosis.',
              ],
              keyPoints: [
                'Fibras gruesas: evaluadas por NCS convencionales.',
                'Fibras finas: NO evaluadas por NCS → biopsia de piel.',
                'Estudio EDx normal NO descarta toda neuropatía.',
              ],
            },
          ]
        },
        {
          id: 'peripheral-nerve-anatomy',
          title: 'Anatomía del nervio periférico',
          titleEn: 'Peripheral nerve anatomy',
          children: [
            { id: 'endo-peri-epineurium', title: 'Endoneuro, perineuro, epineuro', titleEn: 'Endoneurium, perineurium, epineurium', content: 'El nervio periférico se organiza en: Endoneuro (tejido conectivo laxo que rodea cada fibra nerviosa individual), Perineuro (vaina que rodea cada fascículo, forma la barrera hemato-neural), y Epineuro (tejido conectivo que agrupa todos los fascículos formando el tronco nervioso). La lesión de diferentes capas define el grado de severidad (clasificación de Sunderland).' },
            { id: 'vasa-nervorum', title: 'Vasa nervorum y barrera hemato-neural', titleEn: 'Vasa nervorum and blood-nerve barrier',
              content: `Los vasa nervorum son los vasos sanguíneos que irrigan el nervio periférico, organizados en red epineural (sin barrera), perineural y endoneural (con barrera hemato-neural).

**Barrera hemato-neural:**
Análoga a la barrera hematoencefálica, formada por tight junctions en capilares endoneurales y capas del perineuro. Regula selectivamente el paso de sustancias al interior del fascículo nervioso.

**Patología vascular:**
• **Vasculitis de vasa nervorum:** Inflamación y oclusión de vasos del nervio que produce infartos nerviosos focales → mononeuropatía múltiple (poliarteritis nodosa, granulomatosis con poliangeítis, NSVN).
• **Neuropatía isquémica diabética:** Microangiopatía de vasa nervorum como mecanismo de la neuropatía diabética.
• **Ruptura de barrera:** En CIDP y GBS, la pérdida de integridad permite ingreso de anticuerpos y células inflamatorias.`,
              clinicalPearls: [
                'Mononeuropatía múltiple de inicio agudo/subagudo = vasculitis hasta que se demuestre lo contrario.',
                'En diabetes, la microangiopatía de los vasa nervorum es uno de los mecanismos principales de la neuropatía.',
              ],
              keyPoints: [
                'Barrera hemato-neural: tight junctions en capilares endoneurales + perineuro.',
                'Vasculitis de vasa nervorum: causa mononeuropatía múltiple.',
                'Ruptura de barrera: permite entrada de anticuerpos en CIDP/GBS.',
              ],
            },
          ]
        },
        {
          id: 'motor-unit',
          title: 'La unidad motora',
          titleEn: 'The motor unit',
          children: [
            { id: 'motor-unit-composition', title: 'Composición: motoneurona + axón + UNM + fibras musculares', titleEn: 'Composition: motor neuron + axon + NMJ + muscle fibers', content: 'La unidad motora es la unidad funcional básica del sistema neuromuscular. Está compuesta por una motoneurona alfa del asta anterior, su axón (que viaja por raíz ventral, plexo y nervio periférico), la unión neuromuscular, y todas las fibras musculares que inerva. Es la unidad que la EMG estudia directamente.' },
            { id: 'innervation-ratio', title: 'Ratio de inervación', titleEn: 'Innervation ratio', content: 'El ratio de inervación varía enormemente entre músculos: músculos oculares extrínsecos (~5-10 fibras/UM) para movimientos finos, hasta el gastrocnemio (~2000 fibras/UM) para fuerza bruta. Un ratio bajo = control fino; un ratio alto = fuerza.' },
            { id: 'motor-unit-territory', title: 'Territorio de la unidad motora', titleEn: 'Motor unit territory', content: 'Las fibras musculares de una sola unidad motora se distribuyen aleatoriamente dentro de un territorio que se superpone con otras unidades motoras. El PAUM registrado por la aguja concéntrica representa la actividad de ~15-20 fibras dentro del radio de captación del electrodo (aproximadamente 2.5 mm).' },
          ]
        },
      ]
    },
    {
      id: 'muscle-contraction-physiology',
      title: 'Neurofisiología de la Contracción Muscular',
      titleEn: 'Muscle Contraction Neurophysiology',
      description: 'Potencial de acción, transmisión neuromuscular y tipos de fibra',
      children: [
        { id: 'action-potential-generation', title: 'Generación y propagación del potencial de acción', titleEn: 'Action potential generation and propagation', content: 'El potencial de acción se genera cuando la membrana se despolariza hasta alcanzar el umbral (-55 mV). La apertura de canales de Na+ causa una rápida despolarización (fase ascendente), seguida por la inactivación de Na+ y apertura de K+ (repolarización). El período refractario absoluto asegura la conducción unidireccional.' },
        { id: 'neuromuscular-transmission', title: 'Transmisión neuromuscular: acetilcolina y receptores nicotínicos', titleEn: 'Neuromuscular transmission', content: 'La llegada del potencial de acción al terminal presináptico abre canales de Ca² dependientes de voltaje. El influjo de calcio desencadena la fusión de vesículas de acetilcolina (ACh) con la membrana presináptica (exocitosis). La ACh se une a receptores nicotínicos postsinápticos, generando el potencial de placa terminal. La ACh es degradada rápidamente por la acetilcolinesterasa.' },
        { id: 'excitation-contraction', title: 'Acoplamiento excitación-contracción', titleEn: 'Excitation-contraction coupling', content: 'El potencial de acción del sarcolema viaja por los túbulos T, activando los receptores de dihidropiridina (DHPR) que a su vez activan los receptores de rianodina (RyR) del retículo sarcoplásmico. La liberación de Ca²⁺ permite la interacción actina-miosina. La recaptación de Ca²⁺ por la SERCA relaja el músculo.' },
        { id: 'muscle-fiber-types', title: 'Fibras musculares tipo I vs. tipo II', titleEn: 'Type I vs type II muscle fibers', content: 'Tipo I (fibras lentas, rojas, oxidativas): resistentes a la fatiga, reclutadas primero (principio de Henneman). Tipo II (fibras rápidas, blancas, glucolíticas): mayor fuerza y velocidad, reclutadas con mayor esfuerzo. Tipo IIa: intermedias. Tipo IIb/IIx: más rápidas y fatigables. La composición varía entre músculos y puede cambiar con entrenamiento o enfermedad.' },
      ]
    },
  ]
};
