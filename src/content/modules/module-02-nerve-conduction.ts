// src/content/modules/module-02-nerve-conduction.ts
import { Module } from '../../types/content';

export const module02: Module = {
  id: 'nerve-conduction',
  number: 2,
  title: 'Estudios de Conducción Nerviosa',
  titleEn: 'Nerve Conduction Studies',
  emoji: '⚡',
  description: 'Principios, técnicas motoras y sensitivas, valores normales y fenómenos patológicos',
  descriptionEn: 'Principles, motor and sensory techniques, normal values and pathological phenomena',
  color: 'from-yellow-500 to-orange-600',
  icon: 'Zap',
  topics: [
    {
      id: 'general-principles', title: 'Principios Generales de Neuroconducción', titleEn: 'General Principles',
      description: 'Estimulación, electrodos y artefactos',
      children: [
        { id: 'cathode-anode', title: 'Estimulación eléctrica: cátodo vs. ánodo',
          content: `La estimulación eléctrica percutánea es la base de todo estudio de neuroconducción. Comprender la polaridad es esencial para obtener respuestas reproducibles.

**Cátodo (electrodo negativo, negro/rojo según equipo):**
Bajo el cátodo se produce la despolarización del nervio porque la corriente negativa reduce el potencial de membrana hasta alcanzar el umbral de disparo del potencial de acción. Por lo tanto, el cátodo SIEMPRE debe orientarse hacia los electrodos de registro.

**Ánodo (electrodo positivo):**
Bajo el ánodo ocurre hiperpolarización de la membrana, lo que puede impedir la propagación del potencial de acción hacia el registro. Este fenómeno se denomina **bloqueo anódico**.

**Orientación correcta en la práctica:**
• En NCS motora: el cátodo se coloca DISTAL (más cercano al electrodo de registro), el ánodo proximal.
• En NCS sensitiva antidrómica: el cátodo se coloca PROXIMAL al registro (porque la dirección de conducción es del estímulo hacia los dedos).

**Error común — inversión cátodo-ánodo:**
Si se invierte la polaridad, el bloqueo anódico puede causar: reducción de la amplitud del CMAP/SNAP, prolongación de la latencia (la despolarización efectiva ocurre bajo el ánodo, más lejos del registro), y morfología distorsionada del potencial.`,
          clinicalPearls: [
            'Si al estimular obtienes un CMAP de menor amplitud de lo esperado, lo PRIMERO que debes verificar es la orientación del estimulador — la inversión cátodo-ánodo es uno de los errores más frecuentes en principiantes.',
            'Regla mnemotécnica: "cátodo al cáptor" — el cátodo siempre apunta hacia los electrodos de captación (registro).',
          ],
          keyPoints: [
            'Cátodo (negativo) = despolariza el nervio. Ánodo (positivo) = hiperpolariza.',
            'El cátodo siempre se orienta hacia los electrodos de registro.',
            'Bloqueo anódico: la inversión reduce amplitud y prolonga latencia.',
            'Verificar polaridad del estimulador debe ser el primer paso ante un resultado inesperado.',
          ],
          youtubeUrls: [
            { title: 'NCS Basics - Electrode Placement', videoId: 'jXA9wXVU3-g' },
          ],
        },
        { id: 'supramaximal', title: 'Estimulación supramáxima',
          content: `La estimulación supramáxima es un principio fundamental de la técnica de neuroconducción que asegura la activación completa y reproducible de todas las fibras del nervio.

**Técnica paso a paso:**
1. Iniciar con intensidad baja (5-10 mA) e incrementar gradualmente.
2. Observar el aumento progresivo de la amplitud del CMAP/SNAP a medida que se reclutan más fibras nerviosas.
3. Identificar la intensidad a la cual la amplitud ya no aumenta más (estimulación máxima).
4. Incrementar un 20-25% adicional sobre la intensidad máxima → esta es la **estimulación supramáxima**.
5. Usar esta intensidad para todas las mediciones del estudio de ese nervio.

**¿Por qué 20-25% extra?**
Porque durante el estudio el estimulador puede moverse ligeramente, la impedancia de la piel puede cambiar, o los nervios más profundos pueden requerir mayor intensidad. El margen extra asegura que TODAS las fibras permanezcan activadas.

**Estimulación submáxima — el error que debes evitar:**
Si la estimulación es submáxima, solo se activan las fibras de menor umbral (las más gruesas y superficiales). Esto produce un CMAP de menor amplitud que puede ser malinterpretado como pérdida axonal. La latencia también puede parecer más corta (solo responden las fibras más rápidas).

**Consideraciones de comodidad:**
La estimulación supramáxima puede ser incómoda para el paciente. Explica previamente que sentirá una "corriente" y que habrá contracción muscular. Incrementa gradualmente para permitir adaptación.`,
          clinicalPearls: [
            'NUNCA compares amplitudes entre sitios de estimulación si no usas estimulación supramáxima en TODOS los puntos. La estimulación submáxima proximal puede simular un falso bloqueo de conducción.',
            'En pacientes obesos o con edema, puede ser necesario usar duraciones de estímulo más largas (0.2-0.5 ms) en lugar de solo aumentar la intensidad.',
          ],
          keyPoints: [
            'Supramáxima = 20-25% por encima de la intensidad máxima.',
            'Incrementar gradualmente hasta que la amplitud deje de aumentar.',
            'Estimulación submáxima = falsa disminución de amplitud = error diagnóstico.',
            'Usar la misma intensidad supramáxima en TODOS los puntos de estimulación.',
          ],
        },
        { id: 'electrodes', title: 'Electrodos de registro: activo, referencia, tierra',
          content: `La correcta colocación de los electrodos de registro determina la calidad y reproducibilidad de los estudios de neuroconducción.

**Electrodo activo (G1):**
• **NCS motora:** Se coloca sobre el **punto motor** del músculo (zona de máxima amplitud del CMAP). Para APB: eminencia tenar, a mitad distancia entre articulación MCF y pliegue de muñeca. Para ADM: borde ulnar de la mano, sobre la masa muscular.
• **NCS sensitiva (antidrómica):** Se coloca sobre el nervio, con electrodo de anillo en el dedo.

**Electrodo de referencia (G2):**
• **NCS motora:** Sobre el tendón distal del músculo registrado (sitio eléctricamente inactivo). Para APB: articulación MCF del pulgar. Para ADM: base del 5to dedo.
• **NCS sensitiva:** Se coloca 3-4 cm distal al G1 sobre el mismo dedo.

**Electrodo de tierra (Ground):**
Se coloca ENTRE el sitio de estimulación y los electrodos de registro. Función: drenar las corrientes de fuga y reducir el artefacto de estímulo. Usar electrodo de barra o disco adhesivo con gel conductor.

**Verificación de colocación correcta:**
Un CMAP bien registrado debe tener una **deflexión inicial negativa limpia** (ascendente desde la línea base). Si hay una deflexión inicial positiva, el G1 no está sobre el punto motor → reposicionar.`,
          clinicalPearls: [
            'La regla de oro: si ves deflexión inicial positiva en el CMAP, MUEVE el G1. No continúes el estudio con un electrodo mal posicionado porque todas las mediciones serán inexactas.',
            'El electrodo de tierra NUNCA debe estar entre G1 y G2 — siempre entre el estimulador y los electrodos de registro.',
          ],
          keyPoints: [
            'G1 (activo): punto motor del músculo (motor) o sobre el nervio (sensitivo).',
            'G2 (referencia): tendón distal (motor) o 3-4 cm distal en dedo (sensitivo).',
            'Ground: SIEMPRE entre estimulador y registro.',
            'Deflexión inicial positiva = G1 mal posicionado → reposicionar antes de continuar.',
          ],
        },
        { id: 'distance-volume', title: 'Distancia entre electrodos y conducción de volumen',
          content: `La distancia entre los puntos de estimulación y la conducción de volumen son factores técnicos que afectan directamente la precisión de las mediciones.

**Distancia mínima entre sitios de estimulación:**
Para el cálculo de velocidad de conducción motora, la distancia entre el punto de estimulación distal y proximal debe ser de al menos **10 cm**. Con distancias menores, los errores en la medición de la distancia (±0.5 cm) representan un porcentaje mayor del total, generando errores significativos en el cálculo de la velocidad.

**Medición de distancia:**
• Usar cinta métrica flexible (no rígida).
• Medir en línea recta sobre la superficie de la piel entre los puntos de estimulación (marcados con bolígrafo).
• Para el codo: medir con el codo flexionado a 70-90° (el nervio ulnar se estira con la flexión).
• Registrar la distancia en milímetros para mayor precisión.

**Conducción de volumen:**
Las corrientes bioeléctricas se propagan tridimensionalmente a través de los tejidos (músculo, grasa, hueso). Esto puede causar:
• Registro de potenciales de músculos adyacentes no deseados.
• Deflexión inicial positiva cuando el electrodo no está directamente sobre el generador del potencial.
• Captación de actividad motora en estudios sensitivos (especialmente en técnica antidrómica).

**Cómo minimizar la conducción de volumen:**
• Colocar G1 directamente sobre el punto motor.
• Usar distancias G1-G2 adecuadas (no demasiado largas).
• En sensitivos, promediación reduce la contaminación por volumen.`,
          clinicalPearls: [
            'Para el nervio ulnar en el codo: SIEMPRE medir con el codo flexionado a 70-90°. Con el codo en extensión, la distancia medida es mayor a la real y la velocidad calculada será falsamente alta.',
            'Un error de 1 cm en una distancia de 10 cm produce un error del 10% en la velocidad de conducción.',
          ],
          keyPoints: [
            'Distancia mínima entre puntos de estimulación: 10 cm.',
            'Medir con cinta flexible, en mm, con el codo flexionado para ulnar.',
            'Conducción de volumen: propagación de corrientes a tejidos adyacentes.',
            'Error de medición de distancia es la fuente más común de imprecisión en la VCM.',
          ],
        },
        { id: 'averaging-artifacts', title: 'Promedios y artefactos',
          content: `La promediación (averaging) y el reconocimiento de artefactos son habilidades técnicas esenciales para obtener estudios de neuroconducción confiables.

**Promediación (Averaging):**
Consiste en sumar múltiples respuestas al estímulo y dividir por el número de repeticiones. Las señales verdaderas (SNAP, CMAP) se suman coherentemente porque ocurren siempre en el mismo tiempo post-estímulo. El ruido aleatorio se cancela. El resultado es una mejora del SNR proporcional a √n.

**Cuándo promediar:**
• SNAP: casi siempre necesario (10-30 repeticiones), especialmente en MI y pacientes añosos.
• CMAP: generalmente NO necesario (la señal es suficientemente grande). Si promedias un CMAP, probablemente tienes un problema técnico que deberías resolver primero.

**Artefactos comunes y soluciones:**
• **Artefacto de estímulo:** Señal eléctrica grande que precede al potencial biológico. Solución: verificar tierra, reducir impedancia, limpiar gel, alejar tierra del estimulador.
• **Artefacto de movimiento:** Desplazamiento de la línea base por movimiento del paciente o cable. Solución: fijar cables, pedir al paciente que se relaje.
• **Interferencia 50/60 Hz:** Línea base serpenteante con patrón periódico. Solución: reducir impedancia, verificar tierra, alejar equipos eléctricos, desconectar cama eléctrica.
• **Artefacto de base inestable:** Línea base ondulante por sudoración o mala impedancia. Solución: limpiar piel, reaplicar gel.`,
          clinicalPearls: [
            'Si necesitas promediación para ver un CMAP, algo está mal técnicamente — verifica la estimulación y los electrodos.',
            'El filtro "Notch" es el último recurso para eliminar 60 Hz; primero intenta mejorar la impedancia y la tierra.',
          ],
          keyPoints: [
            'Averaging mejora SNR proporcionalmente a √n.',
            'SNAP: promediar 10-30 trazos. CMAP: generalmente un solo trazo basta.',
            'Artefacto de estímulo: verificar tierra y reducir impedancia.',
            'El filtro notch es el último recurso, no el primero.',
          ],
        },
      ]
    },
    {
      id: 'motor-conduction', title: 'Neuroconducción Motora', titleEn: 'Motor Nerve Conduction',
      description: 'CMAP, latencia, amplitud, velocidad y nervios motores por región',
      children: [
        { id: 'cmap-components', title: 'El PAMC (CMAP): componentes y morfología',
          content: `El Potencial de Acción Muscular Compuesto (CMAP o PAMC) es la señal bioeléctrica que se registra al estimular un nervio motor y captar la respuesta del músculo inervado. Representa la suma sincronizada de todos los potenciales de acción de las fibras musculares activadas.

**Componentes del CMAP:**
• **Latencia de inicio:** Tiempo desde el estímulo hasta el comienzo de la deflexión negativa.
• **Fase negativa (ascendente):** Corresponde a la despolarización del músculo bajo el electrodo activo.
• **Amplitud:** Medida de la línea base al pico negativo (base-to-peak) o de pico negativo a pico positivo.
• **Duración de la fase negativa:** Refleja la sincronía de activación de las fibras musculares.
• **Área bajo la curva negativa:** Integra amplitud × duración, más representativa del número total de fibras activadas.

**Morfología normal:**
Un CMAP normal tiene una deflexión inicial negativa suave y rápida, un pico negativo definido, y una fase positiva más lenta. La presencia de deflexión inicial positiva indica que el electrodo G1 NO está sobre el punto motor.

**Significado clínico de cada componente:**
• Amplitud reducida → pérdida axonal o bloqueo de conducción distal.
• Latencia prolongada → desmielinización del segmento distal.
• Duración aumentada → dispersión temporal (desmielinización difusa).
• Área reducida > amplitud reducida → bloqueo de conducción.`,
          clinicalPearls: [
            'El ÁREA del CMAP es más confiable que la amplitud sola para detectar bloqueos de conducción, porque la dispersión temporal puede reducir la amplitud sin pérdida real de fibras.',
            'Un CMAP con muescas (notched) puede indicar reinervación con diferentes velocidades de conducción, o puede ser artefactual por conducción de volumen.',
          ],
          keyPoints: [
            'CMAP = suma de potenciales de acción de todas las fibras musculares.',
            'Amplitud (mV): refleja número de fibras musculares funcionales.',
            'Área: integra amplitud × duración, más sensible para bloqueos.',
            'Deflexión inicial positiva = G1 mal posicionado.',
          ],
        },
        { id: 'distal-latency', title: 'Latencia motora distal (LMD)',
          content: `La latencia motora distal (LMD) es el tiempo transcurrido desde la aplicación del estímulo eléctrico en el punto de estimulación distal hasta el inicio de la deflexión negativa del CMAP.

**Qué incluye la LMD:**
1. Conducción nerviosa en el segmento distal del nervio.
2. Retardo en la transmisión neuromuscular (~1 ms).
3. Despolarización de la fibra muscular hasta el inicio del potencial.

**Cómo medirla:**
Se mide desde el artefacto de estímulo hasta donde la señal del CMAP abandona la línea base y comienza su deflexión negativa. Los cursores del equipo deben colocarse con precisión en ese punto exacto. Amplificar la ganancia ayuda a identificar el punto de despegue exacto.

**Valores normales (ejemplos):**
• Mediano (muñeca a APB, 8 cm): ≤4.4 ms
• Ulnar (muñeca a ADM): ≤3.3 ms
• Peroneo (tobillo a EDB): ≤6.3 ms
• Tibial (tobillo a AH): ≤5.0 ms

**Significado de prolongación:**
Una LMD prolongada indica desmielinización del segmento distal del nervio (entre el punto de estimulación y el músculo). Es la principal herramienta diagnóstica del síndrome del túnel carpiano (LMD del mediano prolongada con LMD del ulnar normal).`,
          clinicalPearls: [
            'En STC: la diferencia de LMD mediano-ulnar >1.5 ms es más sensible que la LMD absoluta del mediano, porque corrige la variabilidad individual.',
            'La LMD incluye el retardo de la UNM (~1 ms). Por eso NO se usa para calcular la velocidad de conducción motora (se necesitan dos puntos de estimulación).',
          ],
          keyPoints: [
            'LMD = tiempo desde estímulo distal hasta inicio de CMAP.',
            'Incluye: conducción nerviosa distal + retardo UNM + despolarización muscular.',
            'Prolongación → desmielinización distal (ej. STC).',
            'Comparación mediano-ulnar: diferencia >1.5 ms = criterio de STC.',
          ],
        },
        { id: 'cmap-amplitude', title: 'Amplitud del CMAP',
          content: `La amplitud del CMAP es el parámetro más importante para evaluar la integridad axonal del nervio motor.

**Medición:**
• **Base-to-peak (línea base al pico negativo):** Método más estandarizado.
• **Pico-a-pico (pico negativo a pico positivo):** Incluye la fase positiva, generalmente más alto.
• Los equipos modernos permiten ambas mediciones automáticas.

**Valores normales típicos (base-to-peak, adultos):**
• Mediano motor (APB): ≥4 mV
• Ulnar motor (ADM): ≥6 mV
• Peroneo motor (EDB): ≥2 mV
• Tibial motor (AH): ≥3 mV

**Significado de la reducción:**
• **Pérdida axonal:** Reducción bilateral simétrica en polineuropatías; asimétrica en mononeuropatías. El CMAP distal es proporcional al grado de pérdida axonal.
• **Bloqueo de conducción:** El CMAP distal puede ser normal, pero la amplitud cae al estimular proximal al bloqueo.
• **Trastornos de UNM:** El CMAP basal puede estar reducido (ej. Lambert-Eaton) o normal (Miastenia Gravis).

**Comparación lado a lado:**
Una diferencia de amplitud >50% entre el mismo nervio de ambas manos sugiere patología unilateral (neuropatía focal, radiculopatía con pérdida axonal).`,
          clinicalPearls: [
            'Un CMAP normal distalmente con caída proximal = bloqueo de conducción (desmielinización focal). Un CMAP reducido distalmente = pérdida axonal. Esta distinción es CLAVE para el diagnóstico.',
            'En neuropatía peronea: CMAP del peroneo bajo puede ser por atrofia del EDB (músculo muy vulnerble), no necesariamente por pérdida axonal severa. Comparar con registro en tibial anterior.',
          ],
          keyPoints: [
            'Medición estándar: base-to-peak (línea base al pico negativo).',
            'Refleja el número de fibras musculares funcionales inervadas.',
            'Reducción distal = pérdida axonal. Caída proximal = bloqueo de conducción.',
            'Comparación lado a lado: diferencia >50% sugiere patología unilateral.',
          ],
        },
        { id: 'motor-cv', title: 'Velocidad de conducción motora (VCM)',
          content: `La velocidad de conducción motora (VCM) mide la rapidez con que el impulso nervioso recorre un segmento de nervio motor, reflejando directamente la integridad de la mielina.

**Fórmula:**
VCM (m/s) = Distancia entre puntos de estimulación (mm) / (Latencia proximal − Latencia distal) (ms)

**¿Por qué se necesitan DOS puntos de estimulación?**
Porque la latencia distal incluye el retardo de la UNM y la despolarización muscular. Al restar las latencias, se cancela este componente y se obtiene puramente el tiempo de conducción nerviosa del segmento entre los dos puntos.

**Valores normales:**
• Miembro superior: ≥50 m/s
• Miembro inferior: ≥40 m/s (los nervios son más largos y las fibras más finas)

**Criterios de desmielinización (EFNS/PNS para CIDP):**
• VCM <70% del límite inferior normal (LIN) en ≥2 nervios motores.
• Para mediano: <70% de 50 m/s = <35 m/s.
• Para peroneo: <70% de 40 m/s = <28 m/s.

**Enlentecimiento leve (70-80% LIN):**
Puede verse en pérdida axonal selectiva de fibras gruesas (las fibras remanentes más lentas determinan la VC), no necesariamente indica desmielinización primaria.`,
          clinicalPearls: [
            'La VCM refleja solo las fibras MÁS RÁPIDAS del nervio. No detecta la pérdida de fibras de velocidad intermedia hasta que se pierden todas las rápidas.',
            'Recuerda: la VCM del ulnar a través del codo debe medirse con el codo flexionado a 70-90°. Esta única posición puede cambiar 10-15 m/s en el resultado.',
          ],
          keyPoints: [
            'VCM = Distancia / (Lat. proximal − Lat. distal).',
            'Requiere DOS puntos de estimulación (excluye retardo de UNM).',
            'Normal: ≥50 m/s MS, ≥40 m/s MI.',
            'VCM <70% LIN en ≥2 nervios = criterio de desmielinización.',
          ],
        },
        { id: 'duration-area', title: 'Duración y área bajo la curva',
          content: `La duración y el área del CMAP son parámetros complementarios a la amplitud que proporcionan información valiosa sobre la sincronía de conducción y la fisiopatología del nervio.

**Duración de la fase negativa del CMAP:**
• Se mide desde el inicio de la deflexión negativa hasta el cruce por la línea base.
• Un CMAP normal tiene una duración breve y un pico definido, indicando que todas las fibras conducen a velocidades similares (buena sincronía).

**Dispersión temporal:**
• Aumento de la duración >30% con estimulación proximal vs. distal = dispersión temporal.
• Indica desmielinización difusa: diferentes fibras conducen a velocidades muy diferentes, llegando al músculo en tiempos distintos, "dispersando" el CMAP en el tiempo.
• El CMAP se aplana y se ensancha, con pérdida de amplitud por cancelación de fase.

**Área bajo la curva (fase negativa):**
• Área = amplitud × duración (integración).
• Es más representativa del número TOTAL de fibras activadas que la amplitud sola.
• Es el parámetro preferido para detectar bloqueos de conducción porque la dispersión temporal puede reducir la amplitud sin reducir el área proporcionalmente.

**Criterios de bloqueo de conducción (EFNS/PNS):**
• Caída de amplitud >50% Y caída de área >50% entre estimulación proximal y distal.
• Con aumento de duración <30% (para excluir pseudo-bloqueo por dispersión).`,
          clinicalPearls: [
            'La diferencia clave: en dispersión temporal, la amplitud baja pero el ÁREA se conserva relativamente. En bloqueo verdadero, TANTO la amplitud COMO el área caen >50%.',
            'Los criterios de bloqueo EFNS/PNS requieren <30% de aumento en duración para diferenciar de cancelación de fase.',
          ],
          keyPoints: [
            'Duración: refleja sincronía de conducción entre fibras.',
            'Dispersión temporal: aumento >30% de duración proximal vs. distal.',
            'Área = amplitud × duración, más sensible para conteo total de fibras.',
            'Bloqueo verdadero: caída >50% de amplitud Y área con <30% aumento de duración.',
          ],
        },
        {
          id: 'upper-limb-motor', title: 'Nervios motores del miembro superior', titleEn: 'Upper limb motor nerves',
          children: [
            { id: 'median-motor', title: 'Nervio Mediano motor',
              content: `El nervio mediano motor es el estudio de neuroconducción más frecuentemente realizado. Es el estándar para evaluar el síndrome del túnel carpiano (STC) y contribuye a la evaluación del tronco inferior/cordón medial del plexo braquial. El músculo registrado es el Abductor Pollicis Brevis (APB), inervado por la rama tenar del mediano (C8-T1).

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 2 Hz |
| Filtro alto (low-pass) | 10 kHz |
| Ganancia | 2-5 mV/div |
| Barrido (sweep) | 2-5 ms/div |
| Duración del estímulo | 0.1-0.2 ms |
| Promediación | No necesaria (CMAP grande) |

**📋 Protocolo paso a paso:**
1. **Preparación:** Limpiar la piel de la eminencia tenar con alcohol. Asegurar temperatura cutánea ≥32°C (calentar si es necesario).
2. **Colocación de G1 (activo):** Palpar la masa muscular del APB en el centro de la eminencia tenar. Colocar el electrodo a la mitad de la distancia entre el pliegue de la muñeca y la articulación MCF del pulgar. Orientar el electrodo en línea con las fibras musculares.
3. **Colocación de G2 (referencia):** Sobre la articulación MCF del pulgar (sitio tendinoso, eléctricamente inactivo).
4. **Colocación de tierra:** Dorso de la mano, entre el estimulador y los electrodos de registro.
5. **Estimulación distal (muñeca):** Exactamente 8 cm proximal al G1. Localizar el punto entre los tendones del palmar largo y el flexor carpi radialis (FCR). Aplicar estímulo perpendicular al nervio.
6. **Verificar la respuesta:** Confirmar deflexión inicial negativa limpia. Si hay deflexión positiva, reposicionar G1 ligeramente más medial.
7. **Alcanzar estimulación supramáxima:** Incrementar intensidad gradualmente hasta que la amplitud del CMAP no aumente más, luego aumentar 20-25%.
8. **Estimulación proximal (codo):** Medial al pulso de la arteria braquial, en la fosa antecubital. Mantener la misma ganancia y sensibilidad.
9. **Estimulación adicional (axila/Erb):** Solo si se sospecha bloqueo de conducción proximal o plexopatía.
10. **Registro de mediciones:** LMD, amplitud, área, duración, VCM.

**📊 Valores de Referencia Completos:**
| Parámetro | Normal | Límite anormal | Criterio desmielinización |
|---|---|---|---|
| LMD (8 cm) | 3.4 - 4.0 ms | >4.4 ms | >6.6 ms (>150% LSN) |
| Amplitud distal | 5 - 15 mV | <4.0 mV | — |
| VCM antebrazo | 52 - 65 m/s | <50 m/s | <35 m/s (<70% LIN) |
| VCM brazo | 55 - 70 m/s | <50 m/s | — |
| Onda F (latencia mínima) | <31 ms | >31 ms | >37 ms (>150% LSN) |
| Diferencia LMD med-ulnar | <1.0 ms | >1.5 ms (STC) | — |

**🔗 Neuropatías Relacionadas:**
• **Síndrome del Túnel Carpiano (STC):** LMD prolongada con SNAP reducido. El estudio más solicitado en electrodiagnóstico.
• **Neuropatía del Pronador Redondo:** Enlentecimiento en antebrazo proximal. Diferencia con STC: sensibilidad palmar afectada.
• **Síndrome del Interóseo Anterior (Kiloh-Nevin):** Motor puro, sin sensitivo. Debilidad de FPL y FDP del dedo 2.
• **Plexopatía braquial — tronco inferior/cordón medial:** CMAP reducido con SNAP ulnar también afectado.
• **Radiculopatía C8-T1:** CMAP puede estar reducido, pero SNAP mediano normal (lesión preganglionar).`,
              clinicalPearls: [
                'La deflexión inicial positiva en el CMAP del mediano sugiere que el G1 está demasiado lateral o que hay una anastomosis de Martin-Gruber (15-30% de la población).',
                'En STC severo, la LMD puede ser >10 ms; usa mayor sensibilidad (ganancia 0.5-1 mV/div) para identificar el punto exacto de inicio del CMAP.',
                'La comparación mediano-ulnar de LMD es más sensible que la LMD absoluta: diferencia >1.5 ms = STC confirmado.',
                'Un CMAP mediano de amplitud muy baja (<1 mV) con LMD muy prolongada indica STC severo con pérdida axonal significativa; la EMG de aguja confirmará denervación del APB.',
                'En anastomosis de Martin-Gruber: el CMAP en muñeca puede ser menor que en codo (paradójico) porque fibras del mediano cruzan al ulnar en el antebrazo.',
                'TRUCO: Si no encuentras la respuesta en la muñeca, verifica que estás estimulando entre los tendones del palmar largo y FCR. Pide al paciente que flexione la muñeca contra resistencia para identificar los tendones.',
                'En pacientes con STC bilateral severo, NO uses el mediano contralateral como referencia — usa comparaciones mediano-ulnar ipsilateral.',
                'La distancia de 8 cm entre estímulo y G1 es CRÍTICA. Distancias menores pueden dar latencias falsamente normales en STC leve.'
              ],
              keyPoints: [
                'Músculo: APB (eminencia tenar). Distancia estándar: 8 cm.',
                'Filtros: 2 Hz - 10 kHz, ganancia 2-5 mV/div.',
                'LMD normal: 3.4-4.0 ms. Anormal: >4.4 ms.',
                'VCM normal: ≥50 m/s. Criterio desmielinización: <35 m/s.',
                'Comparación mediano-ulnar LMD: diferencia >1.5 ms = STC.',
                'Deflexión positiva inicial = G1 mal posicionado o Martin-Gruber.',
              ],
            },
            { id: 'ulnar-motor', title: 'Nervio Ulnar motor',
              content: `El nervio ulnar motor es crucial para localizar atrapamientos en el codo (neuropatía del canal cubital/Canal de Osborne), la segunda mononeuropatía compresiva más frecuente. El músculo registrado es el Abductor Digiti Minimi (ADM), inervado por la rama profunda del ulnar (C8-T1). Alternativamente se puede registrar del Primer Interóseo Dorsal (FDI) para mayor sensibilidad en lesiones del canal de Guyon.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 2 Hz |
| Filtro alto (low-pass) | 10 kHz |
| Ganancia | 2-5 mV/div |
| Barrido (sweep) | 2-5 ms/div |
| Duración del estímulo | 0.1-0.2 ms |
| Promediación | No necesaria |

**📋 Protocolo paso a paso:**
1. **Preparación:** Limpiar piel del borde ulnar de la mano. Temperatura cutánea ≥32°C.
2. **Colocación de G1:** Sobre el ADM, en la masa muscular del borde ulnar de la mano, a mitad de la distancia entre el pliegue de la muñeca y la articulación MCF del 5to dedo.
3. **Colocación de G2:** Quinta articulación MCF (sitio tendinoso).
4. **Tierra:** Dorso de la mano.
5. **Estimulación distal (muñeca):** 8 cm proximal al G1, lateral al tendón del FCU. Confirmar deflexión negativa limpia.
6. **POSICIÓN CRÍTICA DEL CODO:** Flexionar el codo a **70-90 grados**. Esta posición es OBLIGATORIA para evitar medir velocidades falsamente elevadas.
7. **Estimulación bajo codo:** 4 cm distal al epicóndilo medial. Mantener el codo flexionado.
8. **Estimulación sobre codo:** 6 cm proximal al epicóndilo medial (total: 10 cm entre bajo y sobre codo).
9. **Estimulación axila (opcional):** Para evaluar bloqueos más proximales.
10. **Mediciones:** LMD, amplitud en cada punto, VCM segmentario (muñeca-bajo codo, a través del codo, sobre codo-axila).

**📊 Valores de Referencia Completos:**
| Parámetro | Normal | Límite anormal | Criterio desmielinización |
|---|---|---|---|
| LMD (8 cm) | 2.5 - 3.2 ms | >3.4 ms | >5.1 ms (>150% LSN) |
| Amplitud distal | 6 - 16 mV | <5.0 mV | — |
| VCM antebrazo | 52 - 68 m/s | <50 m/s | <35 m/s |
| VCM a través del codo | 50 - 65 m/s | <50 m/s | Caída >10 m/s vs. antebrazo |
| Caída amplitud codo | <20% | >20% = bloqueo | >50% = bloqueo definido |
| Onda F (latencia mínima) | <32 ms | >32 ms | >38 ms |

**🔗 Neuropatías Relacionadas:**
• **Neuropatía del Canal Cubital (codo):** Enlentecimiento VCM a través del codo >10 m/s vs. antebrazo. Bloqueo de conducción focal. La causa más común de neuropatía ulnar.
• **Neuropatía del Canal de Guyon (muñeca):** LMD prolongada con VCM normal en codo. Descartar masa o ganglión en muñeca.
• **Plexopatía braquial — tronco inferior/cordón medial:** CMAP reducido bilateralmente. Evaluar SNAP del cutáneo medial del antebrazo.
• **Radiculopatía C8-T1:** CMAP puede reducirse, pero SNAP ulnar normal (preganglionar).
• **Neuropatía Motora Multifocal (NMM):** Bloqueos de conducción multifocales fuera de sitios de atrapamiento.`,
              clinicalPearls: [
                'REGLA DE ORO: El codo debe estar flexionado a 70-90° durante TODA la medición del ulnar. Esta única variable puede cambiar la VCM en 10-15 m/s.',
                'Una caída de amplitud >20% entre bajo y sobre codo indica bloqueo de conducción. Una caída >50% con <30% aumento de duración = bloqueo definido (criterio EFNS/PNS).',
                'Si la VCM a través del codo es >10 m/s más lenta que en el antebrazo = neuropatía ulnar en codo incluso con VCM absoluta "normal".',
                'El FDI (Primer Interóseo Dorsal) es más sensible que el ADM para detectar lesiones del canal de Guyon y neuropatía cubital distal, porque recibe inervación de la rama profunda.',
                'TRAMPA DIAGNÓSTICA: En anastomosis de Martin-Gruber, el CMAP ulnar puede ser mayor en codo que en muñeca. Esto NO es patológico.',
                'La neuropatía ulnar en codo es frecuente en pacientes en UCI (apoyo prolongado del codo), diabéticos, y post-cirugía bajo anestesia general.',
                'En neuropatía ulnar crónica: buscar el signo de Wartenberg (abducción del 5to dedo en reposo) y el signo de Froment (flexión IP del pulgar al pellizcar).',
                'Si encuentras enlentecimiento ulnar en codo en un paciente sin síntomas, es frecuentemente un hallazgo incidental (el nervio ulnar es vulnerable por su posición superficial).'
              ],
              keyPoints: [
                'Músculo: ADM (borde ulnar). Alternativa: FDI para canal de Guyon.',
                'CODO A 70-90°: posición obligatoria para medición exacta.',
                'LMD normal: 2.5-3.2 ms. VCM codo normal: ≥50 m/s.',
                'Caída de amplitud >20% codo = bloqueo de conducción.',
                'VCM a través del codo >10 m/s más lenta que antebrazo = neuropatía cubital.',
                'Considerar FDI para mayor sensibilidad en lesiones distales del ulnar.',
              ],
            },
            { id: 'radial-motor', title: 'Nervio Radial motor',
              content: `El nervio radial motor evalúa la "parálisis del sábado por la noche" (compresión del nervio radial en el surco espiral del húmero), lesiones por fractura humeral, y el síndrome del nervio interóseo posterior. El músculo registrado es el Extensor Indicis Proprius (EIP), inervado por la rama interósea posterior del radial (C7-C8).

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 2 Hz |
| Filtro alto (low-pass) | 10 kHz |
| Ganancia | 2-5 mV/div |
| Barrido (sweep) | 2-5 ms/div |
| Duración del estímulo | 0.1-0.2 ms |
| Promediación | No necesaria |

**📋 Protocolo paso a paso:**
1. **Preparación:** Limpiar piel del antebrazo dorsal distal. Temperatura ≥32°C.
2. **Colocación de G1:** Sobre el EIP en el tercio distal del antebrazo dorsal. Para localizar: pedir al paciente que extienda el dedo índice con los demás dedos flexionados y palpar la contracción.
3. **Colocación de G2:** Apófisis estiloides ulnar o dorso de muñeca.
4. **Tierra:** Dorso de la mano.
5. **Estimulación distal (antebrazo):** 6-8 cm proximal al G1, sobre la cara lateral del radio.
6. **Estimulación proximal (codo):** En el surco bicipital lateral, entre el braquiorradial y el tendón del bíceps.
7. **Estimulación en brazo (surco espiral):** Cara lateral del húmero en el tercio medio-distal. Este punto es clave para localizar lesiones del surco espiral.
8. **Estimulación en axila/Erb:** Solo si se sospecha lesión proximal o plexopatía.
9. **Comparar amplitudes entre cada punto:** Buscar caída de amplitud entre surco espiral y codo (localización del bloqueo).

**📊 Valores de Referencia Completos:**
| Parámetro | Normal | Límite anormal |
|---|---|---|
| LMD (EIP) | 2.5 - 3.2 ms | >3.5 ms |
| Amplitud (EIP) | 5 - 10 mV | <4.0 mV |
| VCM antebrazo | 58 - 70 m/s | <50 m/s |
| VCM brazo (surco espiral) | 60 - 75 m/s | <50 m/s |
| Caída amplitud surco espiral | <20% | >50% = bloqueo |

**🔗 Neuropatías Relacionadas:**
• **Parálisis del Sábado por la Noche (Saturday Night Palsy):** Compresión en surco espiral. Bloqueo de conducción focal. Mano péndula con extensión de muñeca y dedos afectada.
• **Fractura del húmero:** Lesión directa del nervio en el surco espiral (10-18% de fracturas humerales).
• **Síndrome del Interóseo Posterior (PIN):** Debilidad de extensores de dedos/pulgar sin compromiso sensitivo ni del braquiorradial.
• **Síndrome de la Arcada de Frohse:** Compresión del PIN al pasar bajo el supinador.`,
              clinicalPearls: [
                'El registro en el EIP es más estable que el ECR o Brachioradialis para evaluar bloqueos en el surco espiral, porque el EIP recibe inervación puramente del interóseo posterior.',
                'En la parálisis por surco espiral: el braquiorradial está respetado (se inerva proximal al surco). Si el braquiorradial está débil, la lesión es más proximal (axila o plexo).',
                'TRUCO CLÍNICO: La extensión de muñeca por el ECR long puede estar preservada en lesión del PIN porque recibe ramas antes de la bifurcación. Esto diferencia PIN del surco espiral.',
                'La velocidad del radial es la más rápida del miembro superior (58-70 m/s), por lo que velocidades subóptimas son muy sospechosas.',
                'En fractura humeral, esperar 2-3 semanas post-lesión para estudiar: la degeneración walleriana necesita tiempo para manifestarse distalmente.',
                'El nervio radial es puramente motor distal al codo; los síntomas sensitivos en dorso de mano son de la rama sensitiva superficial, que se estudia por separado.',
              ],
              keyPoints: [
                'Músculo: EIP (antebrazo dorsal distal). Inervación: C7-C8.',
                'LMD normal: 2.5-3.2 ms. VCM más rápida del MS: 58-70 m/s.',
                'Puntos clave: antebrazo, codo, surco espiral, axila.',
                'Caída de amplitud entre surco espiral y codo = localización exacta del bloqueo.',
                'Parálisis del sábado por la noche: braquiorradial respetado = lesión en surco espiral.',
              ],
            },
            { id: 'musculocutaneous-motor', title: 'Nervio Musculocutáneo',
              content: `El nervio musculocutáneo (C5-C6) inerva el bíceps braquial, braquial anterior y coracobraquial. Su estudio es esencial para evaluar plexopatías del tronco superior (Erb-Duchenne) y lesiones aisladas del nervio. La rama sensitiva terminal es el nervio cutáneo lateral del antebrazo.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo | 2 Hz |
| Filtro alto | 10 kHz |
| Ganancia | 2-5 mV/div |
| Barrido | 2-5 ms/div |
| Duración del estímulo | 0.2-0.5 ms |

**📋 Protocolo paso a paso:**
1. **Colocación de G1:** Centro de la masa del bíceps braquial, en el tercio medio del brazo anterior.
2. **Colocación de G2:** Tendón distal del bíceps en el pliegue del codo.
3. **Tierra:** Antebrazo.
4. **Estimulación axila:** Medial al tendón del bíceps en la axila, presionando profundamente.
5. **Estimulación Erb:** Punto de Erb supraclavicular (triángulo posterior del cuello).
6. **Incrementar duración del estímulo a 0.3-0.5 ms** si no se obtiene respuesta (nervio profundo).

**📊 Valores de Referencia:**
| Parámetro | Normal | Límite anormal |
|---|---|---|
| LMD (axila-bíceps) | 3.4 - 4.4 ms | >4.9 ms |
| Amplitud | 3.8 - 21 mV | <3.5 mV |
| VCM (Erb-axila) | ≥50 m/s | <50 m/s |

**🔗 Neuropatías Relacionadas:**
• **Plexopatía braquial — tronco superior (Erb-Duchenne):** Afecta C5-C6, con debilidad de bíceps, deltoides, supraespinoso.
• **Neuropatía aislada del musculocutáneo:** Rara. Puede ocurrir por ejercicio intenso, posición quirúrgica, o trauma.
• **Parsonage-Turner (neuritis braquial):** Frecuentemente afecta el musculocutáneo entre otros nervios.`,
              clinicalPearls: [
                'La estimulación del musculocutáneo en axila requiere presión profunda; aumentar la duración del estímulo a 0.3-0.5 ms ayuda significativamente.',
                'En Parsonage-Turner: el musculocutáneo es uno de los nervios más frecuentemente afectados. La combinación de dolor + debilidad de bíceps en un paciente joven debe alertar.',
                'Comparar SIEMPRE con el lado contralateral: una diferencia de amplitud >50% es altamente significativa.',
                'Si el bíceps parece débil pero el reflejo bicipital está preservado, la lesión puede ser más periférica que radicular.',
              ],
              keyPoints: [
                'Músculo: bíceps braquial. Raíces: C5-C6.',
                'Estimulación: axila (profunda) y Erb supraclavicular.',
                'LMD normal: 3.4-4.4 ms. Amplitud: >3.5 mV.',
                'Importante en plexopatía del tronco superior y Parsonage-Turner.',
              ],
            },
            { id: 'suprascapular-motor', title: 'Nervio Supraescapular',
              content: `El nervio supraescapular (C5-C6) inerva el supraespinoso y el infraespinoso. Es fundamental en la evaluación de patología del hombro, incluyendo compresión en la escotadura supraescapular y la escotadura espinoglenoidea.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo | 2 Hz |
| Filtro alto | 10 kHz |
| Ganancia | 2-5 mV/div |
| Barrido | 2-5 ms/div |
| Duración del estímulo | 0.2-0.5 ms |

**📋 Protocolo paso a paso:**
1. **Registro en supraespinoso:** G1 en la fosa supraespinosa, 2 cm por encima de la espina de la escápula.
2. **Registro alternativo en infraespinoso:** G1 en la fosa infraespinosa, 2 cm por debajo de la espina de la escápula (útil para diferenciar nivel de atrapamiento).
3. **G2:** Sobre la espina de la escápula o acromion.
4. **Estimulación en Erb:** Punto de Erb supraclavicular.
5. **Estimulación en escotadura supraescapular:** Borde superior de la escápula, 1-2 cm medial al acromion. Requiere presión firme.

**📊 Valores de Referencia:**
| Parámetro | Normal | Límite anormal |
|---|---|---|
| LMD (Erb-supraespinoso) | 3.4 - 4.4 ms | >4.9 ms |
| LMD (Erb-infraespinoso) | 3.7 - 4.5 ms | >5.0 ms |
| Amplitud | 5 - 15 mV | <4.0 mV |

**🔗 Neuropatías Relacionadas:**
• **Atrapamiento en escotadura supraescapular:** Afecta supraespinoso E infraespinoso. Frecuente en deportistas de lanzamiento.
• **Atrapamiento en escotadura espinoglenoidea:** Afecta SOLO infraespinoso (el supraespinoso se preserva). Clave para localización.
• **Parsonage-Turner:** Frecuentemente afecta el supraescapular.
• **Quiste ganglionar paraglenoideo:** Puede comprimir el nervio en la escotadura.`,
              clinicalPearls: [
                'LOCALIZACIÓN: Si el supraespinoso Y infraespinoso están afectados → lesión en escotadura supraescapular. Si SOLO el infraespinoso está afectado → lesión en escotadura espinoglenoidea.',
                'En deportistas con dolor de hombro y debilidad de rotación externa: siempre considerar neuropatía del supraescapular antes de asumir patología del manguito rotador puro.',
                'La EMG de aguja del infraespinoso y supraespinoso es indispensable como complemento; la NCS sola puede ser normal en lesiones parciales.',
                'El nervio supraescapular no tiene rama sensitiva cutánea; la patología es puramente motora.',
              ],
              keyPoints: [
                'Músculos: supraespinoso e infraespinoso. Raíces: C5-C6.',
                'Localización: escotadura supraescapular (ambos) vs. espinoglenoidea (solo infraespinoso).',
                'Frecuente en deportistas de lanzamiento y Parsonage-Turner.',
                'Sin componente sensitivo cutáneo.',
              ],
            },
            { id: 'axillary-motor', title: 'Nervio Axilar',
              content: `El nervio axilar (C5-C6) inerva el deltoides y el teres menor. Es esencial en la evaluación de lesiones post-luxación de hombro, fracturas del cuello del húmero, y plexopatías del tronco superior.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo | 2 Hz |
| Filtro alto | 10 kHz |
| Ganancia | 2-5 mV/div |
| Barrido | 2-5 ms/div |
| Duración del estímulo | 0.2-0.5 ms |

**📋 Protocolo paso a paso:**
1. **Colocación de G1:** Sobre el deltoides medio, a medio camino entre el acromion y la inserción deltoidea en el húmero.
2. **Colocación de G2:** Tendón distal del deltoides o sobre el acromion.
3. **Tierra:** Brazo medial.
4. **Estimulación posterior (punto de Erb):** Punto de Erb supraclavicular.
5. **Estimulación axilar posterior:** En la axila posterior, detrás de la cabeza del húmero (el nervio rodea el cuello quirúrgico).
6. **Comparar SIEMPRE con el lado contralateral.**

**📊 Valores de Referencia:**
| Parámetro | Normal | Límite anormal |
|---|---|---|
| LMD (Erb-deltoides) | 3.8 - 5.0 ms | >5.5 ms |
| LMD (axila-deltoides) | 2.5 - 3.8 ms | >4.5 ms |
| Amplitud | 4 - 15 mV | <3.5 mV |

**🔗 Neuropatías Relacionadas:**
• **Luxación anterior de hombro:** El nervio axilar rodea el cuello quirúrgico del húmero y es muy vulnerable. Hasta 35% de luxaciones anteriores lesionan el axilar.
• **Fractura del cuello del húmero:** Mecanismo similar a la luxación.
• **Plexopatía braquial — tronco superior:** Afecta axilar + supraescapular + musculocutáneo.
• **Parsonage-Turner:** El axilar es uno de los nervios más frecuentemente afectados.
• **Síndrome del espacio cuadrilateral:** Compresión del axilar y arteria circunfleja humeral posterior.`,
              clinicalPearls: [
                'Post-luxación de hombro: SIEMPRE evaluar la función del deltoides y la sensibilidad del parche regimental (cara lateral del hombro) antes del estudio electrofisiológico.',
                'Hasta 35% de luxaciones anteriores de hombro lesionan el nervio axilar. La mayoría son neurapraxias que se recuperan en 3-6 meses.',
                'En Parsonage-Turner: el axilar es frecuentemente afectado junto con el supraescapular y el torácico largo. La tríada dolor-debilidad-atrofia con inicio agudo es clásica.',
                'TRUCO: Para estimulación en axila posterior, el paciente debe elevar el brazo y el examinador estimula detrás de la cabeza humeral. Es un punto difícil que requiere práctica.',
                'La sensibilidad del "parche regimental" es mediada por el nervio cutáneo lateral superior del brazo (rama sensitiva del axilar).',
              ],
              keyPoints: [
                'Músculo: deltoides (medio). Raíces: C5-C6.',
                'Muy vulnerable en luxación anterior de hombro (35%).',
                'LMD normal (Erb): 3.8-5.0 ms. Amplitud: >3.5 mV.',
                'Siempre comparar con lado contralateral.',
                'Parche regimental = rama sensitiva del axilar.',
              ],
            },
          ]
        },
        {
          id: 'lower-limb-motor', title: 'Nervios motores del miembro inferior', titleEn: 'Lower limb motor nerves',
          children: [
            { id: 'tibial-motor', title: 'Nervio Tibial',
              content: `El nervio tibial motor es un estudio fundamental para polineuropatías distales y el síndrome del túnel tarsal. El músculo registrado es el Abductor Hallucis (AH), inervado por el nervio plantar medial (rama terminal del tibial, L4-S1).

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 2 Hz |
| Filtro alto (low-pass) | 10 kHz |
| Ganancia | 2-5 mV/div |
| Barrido (sweep) | 3-5 ms/div |
| Duración del estímulo | 0.2-0.5 ms (nervio profundo) |
| Promediación | No necesaria |

**📋 Protocolo paso a paso:**
1. **Preparación:** Limpiar piel del tobillo medial y planta del pie. Temperatura cutánea ≥30°C (MI se enfría más rápido).
2. **Colocación de G1:** Sobre el Abductor Hallucis, justo debajo e inferior al maléolo medial, sobre la masa muscular en la cara medial del pie.
3. **Colocación de G2:** Base del primer dedo (articulación MTF del hallux).
4. **Tierra:** Dorso del pie o tobillo lateral.
5. **Estimulación distal (tobillo):** Posterior al maléolo medial, entre el maléolo y el tendón de Aquiles. Presionar firmemente (nervio profundo).
6. **Verificar respuesta:** Deflexión negativa limpia. Si hay deflexión positiva, reposicionar G1 más plantar.
7. **Incrementar duración del estímulo a 0.3-0.5 ms** si no se obtiene respuesta adecuada.
8. **Estimulación proximal (poplíteo):** Línea media del hueco poplíteo, con el paciente en decúbito prono o la pierna flexionada. Presión firme y profunda.
9. **Alcanzar supramaximalidad en AMBOS puntos** antes de medir.
10. **Registrar:** LMD, amplitudes, VCM, Onda F.

**📊 Valores de Referencia Completos:**
| Parámetro | Normal | Límite anormal | Criterio desmielinización |
|---|---|---|---|
| LMD (tobillo-AH) | 3.8 - 5.0 ms | >5.8 ms | >8.7 ms (>150% LSN) |
| Amplitud distal | 6 - 20 mV | <4.0 mV | — |
| VCM (tobillo-poplíteo) | 42 - 55 m/s | <40 m/s | <28 m/s (<70% LIN) |
| Onda F (latencia mínima) | <56 ms | >56 ms | >67 ms |
| Reflejo H (sóleo) | <34 ms | >34 ms | — |

**🔗 Neuropatías Relacionadas:**
• **Síndrome del Túnel Tarsal:** Compresión del tibial posterior bajo el retináculo flexor. LMD prolongada con estudios comparados medial vs lateral plantar.
• **Polineuropatía diabética:** El tibial es uno de los primeros nervios afectados distalmente. Amplitud reducida + VCM lenta.
• **Radiculopatía S1:** Reflejo H anormal, pero SNAP sural normal (preganglionar). CMAP tibial puede estar reducido si hay pérdida axonal.
• **Neuropatía ciática (división tibial):** Afecta tibial con preservación de peroneo (o viceversa).
• **Plexopatía lumbosacra:** Afecta tibial + peroneo + femoral con contexto clínico (diabetes, cirugía pélvica, radiación).`,
              clinicalPearls: [
                'El nervio tibial es PROFUNDO en el hueco poplíteo; aumentar la duración del estímulo a 0.3-0.5 ms y aplicar presión firme es frecuentemente necesario para obtener estimulación supramáxima.',
                'En polineuropatía diabética temprana: el tibial puede mostrar amplitud reducida cuando el peroneo aún es normal, especialmente si hay predominio de fibras gruesas los.',
                'El Reflejo H del sóleo (estimulación tibial en poplíteo) evalúa el arco reflejo S1 completo: es el estudio más sensible para radiculopatía S1.',
                'TRUCO: Si no obtienes respuesta del AH, intenta registrando del Flexor Hallucis Brevis (planta del pie) como alternativa.',
                'La temperatura es CRÍTICA en MI: por cada 1°C de descenso, la latencia se prolonga ~0.2 ms y la VCM se enlentece ~2 m/s. Siempre calentar la extremidad antes del estudio.',
                'En síndrome del túnel tarsal: comparar las neuroconducciones del plantar medial vs. lateral para localizar la lesión específica.',
                'PERLA CLÍNICA: Un CMAP tibial de baja amplitud bilateral y simétrico es el hallazgo más temprano de polineuropatía axonal. Precede a la pérdida de SNAP sural.',
              ],
              keyPoints: [
                'Músculo: Abductor Hallucis (AH). Raíces: L4-S1.',
                'Estimulación: tobillo posterior al maléolo medial + hueco poplíteo.',
                'LMD normal: 3.8-5.0 ms. VCM normal: ≥40 m/s.',
                'Nervio profundo: usar 0.3-0.5 ms de duración de estímulo.',
                'Reflejo H (sóleo): herramienta sensible para S1.',
                'Temperatura ≥30°C obligatoria en MI.',
              ],
            },
            { id: 'peroneal-motor', title: 'Nervio Peroneo Común (profundo)',
              content: `El nervio peroneo común motor es el estudio clave para evaluar el "pie caído" (foot drop). Es el nervio más vulnerable del miembro inferior por su ubicación superficial al rodear la cabeza del peroné. El músculo registrado es el Extensor Digitorum Brevis (EDB), inervado por el peroneo profundo (L4-S1). Alternativamente, el Tibial Anterior (TA) puede usarse cuando el EDB está atrófico.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 2 Hz |
| Filtro alto (low-pass) | 10 kHz |
| Ganancia | 1-5 mV/div (EDB genera CMAP pequeño) |
| Barrido (sweep) | 3-5 ms/div |
| Duración del estímulo | 0.1-0.2 ms |
| Promediación | No necesaria |

**📋 Protocolo paso a paso:**
1. **Preparación:** Limpiar dorso del pie. Temperatura cutánea ≥30°C.
2. **Colocación de G1:** Sobre el EDB, en el dorso del pie, justo lateral al tendón del extensor largo de los dedos. El músculo se encuentra anterior y lateral al maléolo lateral.
3. **Colocación de G2:** Base del 5to dedo o 5ta articulación MTF.
4. **Tierra:** Tobillo o dorso del pie.
5. **Estimulación distal (tobillo):** Lateral al tendón del tibial anterior, en la cara anterior del tobillo.
6. **Verificar deflexión negativa.** Si hay deflexión positiva, el G1 está demasiado proximal o medial.
7. **Estimulación en peroné (cabeza del peroné):** Justo DEBAJO de la cabeza del peroné, en la cara lateral de la pierna. Este es el sitio más común de compresión.
8. **Estimulación poplítea:** Borde lateral del hueco poplíteo (el nervio ciático se bifurca aquí en tibial y peroneo).
9. **Medir amplitudes en CADA punto y comparar:** La caída entre poplíteo y peroné indica bloqueo a nivel de la cabeza peronea.
10. **REGISTRO ALTERNATIVO en Tibial Anterior:** Si el EDB está muy atrófico (amplitud <1 mV), repetir el estudio registrando del TA para mejor localización del bloqueo.

**📊 Valores de Referencia Completos:**
| Parámetro | Normal | Límite anormal | Criterio desmielinización |
|---|---|---|---|
| LMD (tobillo-EDB) | 4.0 - 5.5 ms | >6.3 ms | >9.5 ms (>150% LSN) |
| Amplitud distal (EDB) | 2 - 8 mV | <2.0 mV | — |
| VCM pierna | 42 - 55 m/s | <40 m/s | <28 m/s (<70% LIN) |
| VCM a través de cabeza peronea | >40 m/s | Caída >10 m/s vs. pierna | Bloqueo focal |
| Caída amplitud cabeza peronea | <20% | >20% = sospecha | >50% = bloqueo definido |
| Onda F (latencia mínima) | <56 ms | >56 ms | — |

**📊 Valores para registro en Tibial Anterior:**
| Parámetro | Normal | Límite |
|---|---|---|
| LMD (peroné-TA) | 2.5 - 4.0 ms | >5.0 ms |
| Amplitud (TA) | 4 - 10 mV | <3.0 mV |

**🔗 Neuropatías Relacionadas:**
• **Neuropatía peronea en cabeza del peroné:** La mononeuropatía más frecuente del MI. Compresión por cruce de piernas, yeso, reposo prolongado, pérdida de peso rápida.
• **Pie caído por radiculopatía L5:** NO hay bloqueo en cabeza peronea. CMAP peroneo puede estar reducido difusamente. SNAP peroneo superficial NORMAL (preganglionar).
• **Neuropatía ciática:** Frecuentemente afecta la división peronea más que la tibial (por vulnerabilidad anatómica).
• **Nervio peroneo accesorio:** Variante anatómica (hasta 28%). Causa CMAP mayor con estimulación en peroné que en tobillo.
• **Síndrome compartimental anterior:** Afecta peroneo profundo selectivamente.
• **CIDP / GBS:** Bloqueos fuera de sitios de atrapamiento (peroneo en muslo, no solo en cabeza peronea).`,
              clinicalPearls: [
                'Si el EDB está muy atrofiado (frecuente en pacientes añosos), cambia el registro al TIBIAL ANTERIOR para localizar bloqueos en la cabeza del peroné. El TA tiene mayor masa muscular y produce un CMAP más grande y confiable.',
                'Sospecha NERVIO PERONEO ACCESORIO si la amplitud del CMAP en TOBILLO es MENOR que en PERONÉ. Confirmación: estimular detrás del maléolo lateral (el nervio accesorio pasa por ahí).',
                'DIAGNÓSTICO DIFERENCIAL CLAVE del pie caído: 1) Neuropatía peronea en cabeza (bloqueo focal), 2) Radiculopatía L5 (SNAP normal), 3) Neuropatía ciática. La NCS + EMG de aguja resuelve este diagnóstico.',
                'La pérdida de peso rápida (>10 kg en meses) es una causa frecuente de neuropatía peronea por pérdida de la capa grasa protectora en la cabeza del peroné.',
                'En neuropatía ciática: la división peronea se afecta MÁS que la tibial en ~85% de los casos, porque las fibras peroneas son más laterales y superficiales dentro del nervio ciático.',
                'TRUCO: Para diferenciar L5 radiculopatía de neuropatía peronea, estudia el tibial motor (inervación L5 parcial) y la EMG del tibial posterior (L5). En radiculopatía L5, ambos estarán afectados; en neuropatía peronea, solo el territorio peroneo.',
                'Un EDB atrofiado con CMAP <1 mV NO siempre indica pérdida axonal severa. El EDB puede atrofiarse por uso de calzado cerrado y envejecimiento. Siempre comparar con el TA.',
                'PERLA AVANZADA: En CIDP vs. neuropatía peronea focal, los bloqueos en CIDP ocurren en sitios NO típicos de atrapamiento (ej. muslo), mientras que en neuropatía focal ocurren solo en la cabeza del peroné.',
              ],
              keyPoints: [
                'Músculo: EDB (dorso del pie). Alternativa: Tibial Anterior.',
                'LMD normal: 4.0-5.5 ms. VCM normal: ≥40 m/s.',
                'Sitio de atrapamiento: cabeza del peroné (cruce de piernas, yeso).',
                'Caída de amplitud >50% en cabeza peronea = bloqueo definido.',
                'Nervio peroneo accesorio: amplitud tobillo < amplitud peroné.',
                'DDx pie caído: peroneo en cabeza > L5 radiculopatía > ciática.',
              ],
            },
            { id: 'femoral-motor', title: 'Nervio Femoral',
              content: `El nervio femoral (L2-L4) inerva el cuádriceps, iliopsoas y sartorio. Su evaluación es esencial en plexopatía lumbar, neuropatía femoral post-quirúrgica, y hematoma retroperitoneal (complicación de anticoagulación). El músculo registrado es el Vasto Medial o Recto Femoral.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 2 Hz |
| Filtro alto (low-pass) | 10 kHz |
| Ganancia | 2-5 mV/div |
| Barrido (sweep) | 5-10 ms/div (latencia larga) |
| Duración del estímulo | 0.5-1.0 ms (nervio MUY profundo) |
| Promediación | Puede ser necesaria |

**📋 Protocolo paso a paso:**
1. **Preparación:** Paciente en decúbito supino con la pierna ligeramente en rotación externa. Limpiar piel del muslo anterior.
2. **Colocación de G1:** Sobre el Vasto Medial, 4-6 cm por encima del borde medial de la rótula, sobre la masa muscular. Alternativa: Recto Femoral en el tercio medio del muslo anterior.
3. **Colocación de G2:** Tendón del cuádriceps o directamente sobre la rótula (sitio tendinoso).
4. **Tierra:** Muslo lateral, entre estimulador y G1.
5. **Estimulación:** Pliegue inguinal, LATERAL a la arteria femoral. Palpar la arteria femoral primero (es la referencia anatómica clave). Colocar el cátodo 1-2 cm lateral a la arteria.
6. **Presión FIRME:** El nervio femoral es profundo. Aumentar la duración del estímulo a 0.5-1.0 ms para alcanzar supramaximalidad.
7. **CUIDADO con la arteria:** No comprimir directamente la arteria femoral. La estimulación debe ser lateral.
8. **Mediciones:** LMD, amplitud. VCM no es calculable (solo hay un punto de estimulación accesible).
9. **SIEMPRE comparar con el lado contralateral:** Una diferencia de amplitud >50% es altamente significativa.

**📊 Valores de Referencia Completos:**
| Parámetro | Normal | Límite anormal |
|---|---|---|
| LMD (inguinal → vasto medial) | 5.0 - 6.2 ms | >7.0 ms |
| LMD (inguinal → recto femoral) | 4.5 - 5.8 ms | >6.5 ms |
| Amplitud | 4 - 15 mV | <3.0 mV |
| Diferencia lado a lado | <50% | >50% = significativo |

**🔗 Neuropatías Relacionadas:**
• **Neuropatía femoral iatrogénica:** Post-cirugía de cadera, histerectomía, nefrectomía. Posición de litotomía prolongada. Uso de retractores.
• **Hematoma del iliopsoas:** Complicación de anticoagulación. Compresión del femoral en la pelvis. Emergencia quirúrgica si progresa.
• **Plexopatía lumbar (L2-L4):** Diabetes (amiotrofia diabética), radiación, infiltración tumoral.
• **Radiculopatía L3-L4:** CMAP puede estar reducido, pero SNAP safeno normal (preganglionar).
• **Amiotrofia diabética (Bruns-Garland):** Plexopatía lumbar dolorosa con afección femoral predominante.`,
              clinicalPearls: [
                'La estimulación del femoral es DIFÍCIL en pacientes obesos. TRUCOS: usar estimulador de cátodo largo, aumentar la duración del estímulo a 0.5-1.0 ms, aplicar presión firme con la otra mano.',
                'SIEMPRE compara con el lado contralateral. Una caída de amplitud >50% es altamente significativa para axonotmesis o neuropraxia del femoral.',
                'En hematoma del iliopsoas: la combinación de dolor inguinal agudo + debilidad del cuádriceps + inhibición del reflejo rotuliano + anticoagulación debe generar una urgencia; solicitar TC/RM del retroperitoneo.',
                'La amiotrofia diabética es frecuentemente confundida con radiculopatía L3-L4. La EMG muestra afección difusa del plexo lumbar (femoral + obturador + glúteo) que NO corresponde a una sola raíz.',
                'TRUCO ANATÓMICO: Palpar la arteria femoral (punto central del ligamento inguinal) y estimular 1-2 cm LATERAL a ella. El nervio SIEMPRE está lateral a la arteria (regla mnemotécnica: N-A-V-E-L de lateral a medial: Nervio-Arteria-Vena-Espacio vacío-Linfáticos).',
                'Post-operatorio de artroplastía de cadera: la debilidad del cuádriceps puede ser por neuropatía femoral por retractores. Siempre evaluar antes de asumir dolor post-quirúrgico "normal".',
              ],
              keyPoints: [
                'Músculo: Vasto Medial (4-6 cm sobre rótula). Raíces: L2-L4.',
                'Estimulación: pliegue inguinal, lateral a la arteria femoral.',
                'Nervio MUY profundo: duración de estímulo 0.5-1.0 ms.',
                'LMD normal: 5.0-6.2 ms. Amplitud: >3.0 mV.',
                'SIEMPRE comparar lado a lado (diferencia >50% = significativo).',
                'N-A-V-E-L: Nervio femoral siempre lateral a la arteria.',
              ],
            },
          ]
        },
        {
          id: 'cranial-motor', title: 'Nervios craneales motores', titleEn: 'Motor cranial nerves',
          children: [
            {
              id: 'facial-motor',
              title: 'Nervio Facial (VII)',
              content: `El estudio motor del Nervio Facial (VII) evalúa la conducción nerviosa desde el tronco principal a sus distintas ramas faciales. Es esencial para el diagnóstico diferencial y pronóstico de la Parálisis de Bell vs. parálisis central, y otras lesiones del facial.

### 1. Montaje de Electrodos y Puntos de Registro
Se pueden emplear registros en diferentes músculos, siendo el **músculo nasal** el punto de captación óptimo por estabilidad.

*   **Opción A: Músculo Nasal (Recomendado)**
    *   **G1 (Activo):** Vientre del músculo nasal (lateral a mitad de nariz).
    *   **G2 (Referencia):** Dorso nasal o nasal contralateral.
    *   **E0 (Tierra):** Frente, mentón o base del cuello.
*   **Opción B: Orbicular de los ojos**
    *   **G1:** Debajo de la pupila o borde lateral de la órbita.
    *   **G2:** Orbicular contralateral o puente nasal.
*   **Opción C: Orbicular de los labios**
    *   **G1:** Lateral al ángulo de la boca.
    *   **G2:** Dorso nasal o barbilla.

### 2. Técnica de Estimulación
El cátodo (negro) debe mirar siempre hacia el electrodo de registro (G1).

*   **Estimulación Global (Tronco Principal):** 
    *   **Preauricular:** Delante del trago, sobre glándula parótida, por encima del ángulo mandibular.
    *   **Postauricular (Agujero estilomastoideo):** Detrás del lóbulo inferior, por debajo de la mastoides.
*   **Intensidad:** Debe ser **supramáxima** (+20-30%) para despolarización sincrónica.
*   **Estimulación segmentaria (ramas):** Frontal/Temporal, Cigomática, Mandibular.

### 3. Parámetros del Equipo
*   **Sensibilidad:** 200 - 1,000 µV/div (respuestas faciales son de menor amplitud que en extremidades).
*   **Filtros:** 8-10 Hz a 8-10 kHz.
*   **Barrido:** 1-2 ms/div.
*   **Duración Estímulo:** 0.1 - 0.3 ms.

### 4. Valores Normales y Criterios
*El análisis comparativo lado a lado es obligatorio y más importante que el valor absoluto.*

*   **Latencia Distal (Nasalis - Preauricular):** 3.57 ± 0.35 ms (Rango: 2.8 - 4.1 ms).
*   **Latencia Distal (Nasalis - Postauricular):** 3.88 ± 0.36 ms (Rango: 3.2 - 4.4 ms).
*   **Latencia Distal (Orbicular ojos):** ≤ 3.1 ms.
*   **Amplitud CMAP (Nasalis):** ≥ 1.0 mV (sanos 2-4 mV).
*   **Asimetría (Lado sano vs afectado):** 
    *   Diferencia de amplitud >50% es indicativa de patología / pérdida axonal significativa.
    *   Diferencia de latencia no debe superar 20-30% (>0.6 ms).`,
              clinicalPearls: [
                'La evaluación pronóstica en parálisis facial periférica (ej. Parálisis de Bell) se realiza de forma óptima a partir del 6º día de evolución (idealmente días 10-14), momento en que la degeneración walleriana distal se ha completado. Evaluar antes subestima el daño.',
                'Si el lado paralizado preserva >50% de la amplitud del lado sano en el día 10, la lesión es predominantemente desmielinizante (neuroapraxia) y el pronóstico de recuperación es excelente.',
                'Caída de amplitud >50-75% sugiere axonotmesis severa, previendo recuperación prolongada o incompleta, con riesgo de sincinesias.',
                '¡Cuidado con el Masetero! Un estímulo excesivo o mal posicionado cerca del trago puede despolarizar el nervio trigémino (V3) y registrar en el masetero, falseando una respuesta normal. Toca el masetero durante el estímulo para verificar.'
              ],
              keyPoints: [
                'Registro óptimo: Músculo nasal (G1 vientre, G2 dorso nasal).',
                'Estimulación: Preauricular o en agujero estilomastoideo.',
                'Ganancia baja: 200 - 1,000 µV/div (señales pequeñas).',
                'El factor clave es la asimetría de amplitud lado a lado (>50% caída).',
                'Estudiar a los 10-14 días en lesiones agudas (Parálisis de Bell).',
                'Riesgo técnico: coestimulación del masetero (V3).'
              ]
            },
            {
              id: 'trigeminal-motor',
              title: 'Nervio Trigémino motor (V)',
              content: `La evaluación electrodiagnóstica de la porción motora del nervio trigémino (rama mandibular, V3) difiere de los estudios de conducción nerviosa convencionales de las extremidades debido a su localización profunda y su cercanía anatómica con otras estructuras faciales.

### 1. Enfoques Diagnósticos Recomendados
Debido a la dificultad técnica de una estimulación eléctrica directa del nervio, la función trigeminal se evalúa típicamente usando tres metodologías complementarias:

*   **Electromiografía de Aguja (EMG):** Es el método más directo y práctico. Se inserta una aguja concéntrica en el **músculo masetero** (dos traveses de dedo anterior y superior al ángulo de la mandíbula). Se evalúa actividad espontánea y los PAUM al pedir al paciente que apriete la mandíbula. Es altamente sensible para denervación en ELA bulbar.
*   **Reflejo de Parpadeo (Blink Reflex):** Evalúa indirectamente la vía aferente sensitiva del trigémino (V1 oftálmica) y sus conexiones pontomedulares, registrando en el músculo orbicular de los ojos tras estimular el nervio supraorbitario.
*   **Reflejo Maseterino (Jaw Jerk Reflex):** Evaluación de la vía monosináptica trigeminal (aferente V3 y eferente V3) mediante percusión mecánica del mentón. Latencia media normal: 7.3 ± 0.74 ms.

### 2. Estudio de Neuroconducción Directa (Técnica Avanzada)
Si bien no es un estándar universal de laboratorio, cuando se requiere medir la latencia y amplitud directas de la rama mandibular, se utiliza el siguiente protocolo:

*   **Montaje de Registro (Masetero):**
    *   **G1 (Activo):** Sobre el vientre del músculo masetero, determinado mediante palpación mientras el paciente aprieta los dientes.
    *   **G2 (Referencia):** Sobre un punto inactivo, como la nariz, pómulo o el lóbulo de la oreja.
    *   **E0 (Tierra):** Mentón o frente.
*   **Estimulación:** Directa por debajo del arco cigomático (en la escotadura mandibular o fosa infratemporal).
*   **Precaución Crítica:** Es muy fácil co-estimular accidentalmente el nervio facial debido a su proximidad. Se debe observar/palpar cuidadosamente que sea el masetero el que se contraiga de manera aislada.

### 3. Valores de Referencia (Conducción Directa)
*Nota: Los laboratorios deben establecer sus propios valores, pero la literatura aporta los siguientes promedios en adultos sanos:*
*   **Latencia Distal:** 1.5 a 2.0 ms (Media ~1.5 ± 0.14 ms).
*   **Amplitud CMAP:** 15 a 30 mV (Media ~25.8 ± 6.24 mV).`,
              clinicalPearls: [
                'La electromiografía de aguja del músculo masetero o temporal es preferible a los estudios de neuroconducción en la práctica diaria para evaluar compromiso motor trigeminal (ej. sospecha de ELA bulbar).',
                'El músculo masetero es extremadamente fácil de activar voluntariamente para el paciente, permitiendo una excelente evaluación del reclutamiento y morfología de los PAUM.',
                'En los estudios de neuroconducción facial (VII par), el error más frecuente es co-estimular inadvertidamente la rama mandibular del trigémino. Esto genera una respuesta maseterina engañosa (falso negativo) cuando el facial está paralizado.'
              ],
              keyPoints: [
                'La evaluación funcional depende principalmente de EMG de aguja y Blink Reflex.',
                'EMG: Músculo masetero (rama V3).',
                'Conducción motora directa: difícil y no estandarizada universalmente.',
                'Latencia motora directa (estimada): ~1.5 - 2.0 ms.',
                'Reflejo maseterino: latencia media ~7.3 ms.'
              ]
            },
            { id: 'accessory-motor', title: 'Nervio Espinal Accesorio (XI)', content: 'Registro: ECM o trapecio. LMD 2.0-4.0 ms, amplitud 3-8 mV, VCM ≥60 m/s.' },
            { id: 'hypoglossal-motor', title: 'Nervio Hipogloso (XII)', content: 'Registro: geniogloso (aguja). LMD 2.0-3.5 ms, amplitud ≥2 mV.' },
            { id: 'glossopharyngeal-motor', title: 'Nervio Glosofaríngeo motor (IX)', content: 'Registro: faríngeos. LMD 3.0-4.5 ms, amplitud 1-3 mV.' },
            { id: 'vagus-motor', title: 'Nervio Vago motor (X)', content: 'Registro: cricotiroideo. LMD 3.0-5.0 ms, amplitud 0.5-2.5 mV. Monitorizar ritmo cardíaco.' },
          ]
        },
        {
          id: 'trunk-nerves', title: 'Nervios del Tronco y Respiratorios',
          children: [
            {
              id: 'phrenic-motor',
              title: 'Nervio Frénico y Diafragma',
              content: `La realización del estudio de neuroconducción motora del nervio frénico evalúa la integridad del circuito eferente hacia el diafragma. Es fundamental en el diagnóstico de patologías restrictivas respiratorias neuromusculares, como la Esclerosis Lateral Amiotrófica (ELA) y en el abordaje del fracaso en la desconexión de ventilación mecánica en la UCI (weaning).

### 1. Técnica de Estimulación (Cuello)
El paciente debe estar en decúbito supino, con el cuello en posición neutra o ligeramente extendida.
*   **Colocación del Estimulador:**
    *   **Opción A (Lateral):** Cátodo en el borde posterior del músculo esternocleidomastoideo (ECM), en la fosa supraclavicular, ~3 cm por encima de la clavícula.
    *   **Opción B (Anterolateral):** Entre las cabezas esternal y clavicular del ECM.
*   **Técnica:** Se requiere presión firme para penetrar la corriente. Incrementar la intensidad gradualmente hasta estimulación supramáxima.
*   **Precauciones:** Evitar co-estimular el nervio espinal accesorio (contracción del trapecio) o el plexo braquial (movimiento del hombro). En sujetos delgados se observará una sacudida diafragmática similar a un "hipo".

### 2. Montaje de Registro (Diafragma)
Se utiliza un montaje de "vientre-tendón" con electrodos de superficie:
*   **G1 (Activo):** 5 cm (dos traveses de dedo) por encima de la punta de la apófisis xifoides.
*   **G2 (Referencia):** Sobre el margen costal anterior, a 16 cm de distancia de G1 (habitualmente en el séptimo espacio intercostal).
*   **E0 (Tierra):** Sobre la parte superior del pecho o tórax.
*(Nota: Para mayor precisión, se puede realizar registro con aguja ecoguiada para evitar neumotórax).*

### 3. Consideraciones Respiratorias
*   El paciente debe realizar una **respiración tranquila**. La respiración profunda modifica la impedancia y posición del diafragma.
*   Las amplitudes del CMAP son ligeramente **mayores durante la inspiración** (acortamiento de las fibras).

### 4. Valores de Referencia Normales
*   **Amplitud del CMAP:** > 320 µV (Media ~597 ± 139 µV). (En inspiración media ~1.0 mV).
*   **Latencia Distal:** < 8.0 ms (Media ~6.3 ± 0.8 ms).
*   **Diferencia lado a lado (Latencia):** Límite máximo de asimetría ~0.61 ms.`,
              clinicalPearls: [
                'En ELA, el 3% debuta con debilidad respiratoria, pero la mayoría la desarrolla al final. El CMAP frénico es un biomarcador excelente de la pérdida de masa diafragmática.',
                'En pacientes de UCI (destete difícil), este estudio diferencia una polineuropatía del paciente crítico (bilateral) de una lesión iatrogénica del frénico (unilateral, ej. post-cirugía cardíaca con hielo).',
                'CONTRAINDICACIÓN: No realizar en UCI si el paciente tiene marcapasos externo o una vía venosa central ipsilateral (riesgo de conducción de corriente al miocardio).',
                'La alternativa de oro moderna en UCI es la ecografía diafragmática (Modo M), evaluando el engrosamiento (>20%) y la excursión (>1.9 cm) sin artefactos eléctricos.'
              ],
              keyPoints: [
                'Estimulación: Borde posterior o entre cabezas del ECM (cuello).',
                'Registro G1: 5 cm por encima del xifoides.',
                'Amplitud normal: > 320 µV (es un potencial pequeño).',
                'Latencia normal: < 8.0 ms.',
                'Precaución: Respiración tranquila, evitar coestimulación del plexo.'
              ]
            }
          ]
        },
        { id: 'motor-interpretation', title: 'Interpretación: normal vs. axonal vs. desmielinizante', content: `Patrón axonal: amplitud reducida con latencias y velocidades relativamente preservadas.
Patrón desmielinizante: latencias prolongadas, velocidades lentas, dispersión temporal, bloqueos de conducción, con amplitudes inicialmente preservadas.
Patrón mixto: combinación de ambos (ej. CIDP crónica con daño axonal secundario).` },
      ]
    },
    {
      id: 'sensory-conduction', title: 'Neuroconducción Sensitiva', titleEn: 'Sensory Nerve Conduction',
      description: 'SNAP, técnicas antidrómicas/ortodrómicas y nervios sensitivos',
      children: [
        { id: 'snap-morphology', title: 'El PANS (SNAP): morfología y medición', content: `El Potencial de Acción del Nervio Sensitivo es una señal de mucho menor amplitud que el CMAP (µV vs. mV). Es bifásico o trifásico.
Se mide amplitud base-pico o pico-pico, latencia de inicio o de pico, y se calcula velocidad de conducción sensitiva.` },
        { id: 'onset-peak-latency', title: 'Latencia de inicio y latencia pico', content: `La latencia de inicio corresponde a las fibras más rápidas; la latencia pico es más reproducible pero incluye fibras de velocidad media.
La latencia pico se usa más frecuentemente en la práctica clínica por su mayor reproducibilidad.` },
        { id: 'snap-amplitude', title: 'Amplitud del SNAP', content: `La amplitud del SNAP refleja el número de fibras sensitivas funcionalmente intactas.
Es muy sensible a la temperatura (disminuye con el enfriamiento). Disminuye con la edad.
Valores muy variables entre pacientes; la comparación lado a lado es más útil que los valores absolutos.` },
        { id: 'sensory-cv', title: 'Velocidad de conducción sensitiva (VCS)', content: `VCS = Distancia / Latencia de inicio.
Normal: ≥50 m/s en MS, ≥40 m/s en MI. Suele ser ligeramente más rápida que la VCM del mismo nervio en condiciones normales.` },
        { id: 'antidromic-orthodromic', title: 'Técnica antidrómica vs. ortodrómica', content: `Antidrómica: estimulación proximal, registro distal (contra la dirección fisiológica). Ventaja: mayor amplitud (más fibras estimuladas). Desventaja: potencial artefacto por CMAP.
Ortodrómica: estimulación distal, registro proximal (fisiológica). Ventaja: sin contaminación motora. Desventaja: menor amplitud.` },
        {
          id: 'upper-limb-sensory', title: 'Nervios sensitivos del miembro superior',
          children: [
            { id: 'median-sensory', title: 'Nervio Mediano sensitivo (dedo 2 y 3)',
              content: `El SNAP del nervio mediano es la técnica más sensible para el diagnóstico temprano del síndrome del túnel carpiano (STC). Es el estudio sensitivo más frecuentemente realizado en electromiografía. Se registra antidrómica u ortodrómicamente de los dedos 2 o 3 (inervación mediana pura, a diferencia del dedo 1 que tiene contribución radial).

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 20 Hz |
| Filtro alto (low-pass) | 2 kHz |
| Ganancia | 10-20 µV/div |
| Barrido (sweep) | 1-2 ms/div |
| Duración del estímulo | 0.1 ms |
| Promediación | 10-30 trazos (recomendado) |

**📋 Protocolo paso a paso (Antidrómico):**
1. **Preparación:** Limpiar piel de la muñeca y el dedo. Temperatura cutánea ≥32°C (CRÍTICO: el SNAP es muy sensible al frío).
2. **Colocación de G1:** Electrodo de anillo en la base del dedo 2 (o 3), rodeando completamente la falange proximal.
3. **Colocación de G2:** Electrodo de anillo 3-4 cm distal al G1, sobre la falange media.
4. **Tierra:** Dorso de la mano, entre el estimulador y el G1.
5. **Estimulación:** Muñeca, 14 cm proximal al G1 (distancia estándar). Localizar entre tendones del palmar largo y FCR.
6. **Promediación:** Promediar 10-30 trazos para mejorar la relación señal-ruido.
7. **Estudio comparativo con dedo 4:** Registrar SNAP del dedo 4 con estimulación del mediano y del ulnar por separado. La diferencia de latencia >0.4 ms = STC.
8. **Registro contralateral:** Si hay duda, comparar con el mediano sensitivo del otro lado.

**📊 Valores de Referencia Completos:**
| Parámetro (14 cm) | Normal | Límite anormal | Significado |
|---|---|---|---|
| Latencia Pico | 2.8 - 3.4 ms | >3.6 ms | Desmielinización distal (STC) |
| Latencia Onset | 2.5 - 3.2 ms | >3.5 ms | Fibras más rápidas afectadas |
| Amplitud (P-P) | 20 - 60 µV | <15 µV | Pérdida axonal sensitiva |
| VCS | 55 - 65 m/s | <50 m/s | Enlentecimiento difuso |
| Dif. latencia med-ulnar (dedo 4) | <0.4 ms | >0.4 ms | STC (muy sensible) |

**🔗 Neuropatías Relacionadas:**
• **Síndrome del Túnel Carpiano (STC):** Latencia prolongada y/o amplitud reducida. El estudio sensitivo es más sensible que el motor para STC leve.
• **Polineuropatía diabética:** Reducción simétrica bilateral de amplitudes con VCS lenta.
• **Neuropatía del pronador redondo:** SNAP mediano reducido con NCS motora anormal en antebrazo.
• **Plexopatía del tronco inferior:** SNAP mediano puede estar reducido si hay componente postganglionar (diferencia con radiculopatía).`,
              clinicalPearls: [
                'La amplitud del SNAP mediano cae significativamente con el frío; calentar las manos a ≥32°C es OBLIGATORIO para evitar falsos positivos de STC.',
                'El estudio comparativo del dedo 4 (mediano vs. ulnar) es MÁS SENSIBLE que el SNAP convencional para STC: diferencia de latencia >0.4 ms = diagnóstico.',
                'En pacientes >60 años, el SNAP puede estar fisiológicamente reducido. Usar comparación lado a lado (>50% diferencia = significativo) en vez de valores absolutos.',
                'CASCADA DIAGNÓSTICA del STC (de más a menos sensible): 1) Palmar mixing, 2) Dedo 4 comparativo, 3) SNAP dedo 2/3, 4) LMD motora.',
                'En STC severo con SNAP ausente: NO asumas daño sensitivo irreversible. El SNAP puede reaparecer tras cirugía de liberación.',
                'TRUCO: Si el SNAP es difícil de obtener, reduce la impedancia limpiando la piel con alcohol, usa gel conductor fresco, y aumenta la promediación a 50 trazos.',
              ],
              keyPoints: [
                'Registro: anillo en dedo 2 o 3. Distancia estándar: 14 cm.',
                'Filtros: 20 Hz - 2 kHz. Ganancia: 10-20 µV/div.',
                'Latencia pico normal: 2.8-3.4 ms. Amplitud: ≥15 µV.',
                'Dedo 4 comparativo: diferencia >0.4 ms = STC.',
                'El estudio sensitivo es MÁS SENSIBLE que el motor para STC leve.',
                'Temperatura ≥32°C obligatoria.',
              ],
            },
            { id: 'ulnar-sensory', title: 'Nervio Ulnar sensitivo (dedo 5)',
              content: `El SNAP del nervio ulnar evalúa la integridad de la rama sensitiva dorsal y las fibras sensitivas del nervio ulnar (C8-T1). Se registra del dedo 5 (territorio ulnar puro). Es fundamental como comparación con el mediano en el diagnóstico del STC y para evaluar neuropatía ulnar y plexopatía del tronco inferior.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 20 Hz |
| Filtro alto (low-pass) | 2 kHz |
| Ganancia | 10-20 µV/div |
| Barrido (sweep) | 1-2 ms/div |
| Duración del estímulo | 0.1 ms |
| Promediación | 10-20 trazos |

**📋 Protocolo paso a paso (Antidrómico):**
1. **Preparación:** Limpiar piel del 5to dedo y muñeca. Temperatura ≥32°C.
2. **Colocación de G1:** Electrodo de anillo en la base del 5to dedo (falange proximal).
3. **Colocación de G2:** 3-4 cm distal al G1.
4. **Tierra:** Dorso de la mano.
5. **Estimulación:** Muñeca, 14 cm proximal al G1, lateral al tendón del FCU.
6. **Promediación:** 10-20 trazos.
7. **Comparación con mediano:** Estudiar el mediano sensitivo con la misma distancia para comparaciones válidas.
8. **Rama dorsal:** En sospecha de neuropatía ulnar en muñeca (Guyon), estudiar la rama sensitiva dorsal del ulnar por separado (se separa antes del canal de Guyon).

**📊 Valores de Referencia Completos:**
| Parámetro (14 cm) | Normal | Límite anormal |
|---|---|---|
| Latencia Pico | 2.8 - 3.3 ms | >3.5 ms |
| Amplitud (P-P) | 15 - 50 µV | <10 µV |
| VCS | 55 - 65 m/s | <50 m/s |
| Rama dorsal (10 cm) | Amplitud ≥10 µV | <5 µV |

**🔗 Neuropatías Relacionadas:**
• **Neuropatía ulnar en codo:** SNAP puede estar reducido en neuropatía cubital crónica con pérdida axonal.
• **Neuropatía del canal de Guyon:** SNAP del 5to dedo afectado, pero rama dorsal NORMAL (se separa antes del canal).
• **Plexopatía del tronco inferior:** SNAP ulnar reducido + SNAP cutáneo medial del antebrazo reducido.
• **Radiculopatía C8-T1:** SNAP ulnar NORMAL (preganglionar). Clave para diferenciación.`,
              clinicalPearls: [
                'Si el SNAP del dedo 5 es normal pero el paciente tiene síntomas, evalúa el N. Cutáneo Medial del Antebrazo: si está reducido = lesión de tronco inferior (plexopatía).',
                'La RAMA DORSAL del ulnar es clave para localización: se separa 6-8 cm proximal a la muñeca. Si la rama dorsal es normal pero el SNAP del 5to dedo está ausente → lesión en canal de Guyon (distal a la bifurcación).',
                'En neuropatía ulnar crónica en codo: el SNAP se reduce progresivamente. Un SNAP ulnar ausente indica pérdida axonal significativa y peor pronóstico.',
                'PERLA COMPARATIVA: En STC, el SNAP ulnar debe ser NORMAL (úsalo como control interno). Si el ulnar también está reducido, sospecha polineuropatía o plexopatía.',
                'La amplitud del SNAP ulnar disminuye con la edad: en >60 años, puede ser fisiológicamente <15 µV. Siempre comparar lado a lado.',
              ],
              keyPoints: [
                'Registro: anillo en dedo 5. Distancia estándar: 14 cm.',
                'Latencia pico normal: 2.8-3.3 ms. Amplitud: ≥10 µV.',
                'Rama dorsal: clave para localizar neuropatía ulnar en muñeca (Guyon).',
                'SNAP ulnar normal = control interno en STC.',
                'SNAP normal con síntomas → evaluar cutáneo medial del antebrazo.',
              ],
            },
            { id: 'radial-sensory', title: 'Nervio Radial sensitivo (tabaquera anatómica)',
              content: `El SNAP radial evalúa la rama sensitiva superficial del nervio radial (C6-C7). Se registra en la tabaquera anatómica. Es un potencial robusto con alta amplitud, útil como referencia en polineuropatías y para diagnosticar el síndrome de Wartenberg (neuropatía radial sensitiva aislada).

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 20 Hz |
| Filtro alto (low-pass) | 2 kHz |
| Ganancia | 10-20 µV/div |
| Barrido (sweep) | 1-2 ms/div |
| Duración del estímulo | 0.1 ms |
| Promediación | Generalmente no necesaria (amplitud alta) |

**📋 Protocolo paso a paso (Antidrómico):**
1. **Preparación:** Limpiar piel del antebrazo lateral y muñeca dorsal. Temperatura ≥32°C.
2. **Colocación de G1:** En la tabaquera anatómica, entre los tendones del extensor corto del pulgar y extensor largo del pulgar. Pedir al paciente que extienda el pulgar para identificar los tendones.
3. **Colocación de G2:** 3-4 cm distal sobre el dorso de la mano, en la misma línea.
4. **Tierra:** Dorso de la mano.
5. **Estimulación:** Antebrazo lateral, 10 cm proximal al G1, sobre la cara lateral del radio.
6. **El potencial suele ser grande y fácil de obtener** sin promediación.

**📊 Valores de Referencia Completos:**
| Parámetro (10 cm) | Normal | Límite anormal |
|---|---|---|
| Latencia Pico | 2.1 - 2.5 ms | >2.8 ms |
| Amplitud (P-P) | 30 - 60 µV | <15 µV |
| VCS | 58 - 70 m/s | <50 m/s |

**🔗 Neuropatías Relacionadas:**
• **Síndrome de Wartenberg:** Neuropatía sensitiva pura del radial superficial. Dolor/parestesias en dorso de la mano. SNAP radial reducido con motor normal.
• **Tenosinovitis de De Quervain:** Puede comprimir el radial sensitivo superficial por vecindad anatómica.
• **Lesión del radial en surco espiral:** El SNAP radial puede estar afectado si la lesión es proximal a la bifurcación sensitiva.`,
              clinicalPearls: [
                'El SNAP radial tiene la amplitud más alta de todos los nervios sensitivos del MS (30-60 µV). Si está significativamente reducido, sospechar patología real.',
                'El síndrome de Wartenberg se produce frecuentemente por pulseras o bandas apretadas, uso repetitivo de tijeras, o handcuffing (esposas). Buscar el signo de Tinel en el borde lateral del radio.',
                'TRUCO: Si el nervio radial sensitivo se estimula demasiado medial, se puede coestimular el nervio cutáneo lateral del antebrazo (musculocutáneo). Mantener la estimulación sobre el borde lateral del radio.',
                'El SNAP radial es un excelente "nervio control" en la evaluación de STC: debe ser normal.',
                'En pacientes con De Quervain: el SNAP radial puede estar reducido ipsilateralmente. Es importante evaluar antes de planificar cirugía.',
              ],
              keyPoints: [
                'Registro: tabaquera anatómica. Distancia: 10 cm.',
                'Amplitud más alta del MS: 30-60 µV.',
                'Latencia pico normal: 2.1-2.5 ms. VCS: 58-70 m/s.',
                'Síndrome de Wartenberg: neuropatía sensitiva pura del radial.',
                'Excelente nervio control para STC (debe ser normal).',
              ],
            },
            { id: 'lateral-cutaneous-forearm', title: 'N. Cutáneo lateral del antebrazo (musculocutáneo)',
              content: `El nervio cutáneo lateral del antebrazo es la rama sensitiva terminal del nervio musculocutáneo (C5-C6). Inerva la cara lateral del antebrazo desde el codo hasta la muñeca. Es fundamental en la evaluación de plexopatías del tronco superior y lesiones del musculocutáneo.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo | 20 Hz |
| Filtro alto | 2 kHz |
| Ganancia | 10-20 µV/div |
| Barrido | 1-2 ms/div |
| Promediación | 20-30 trazos |

**📋 Protocolo paso a paso (Ortodrómico):**
1. **Colocación de G1:** 2 cm lateral al tendón del bíceps en el pliegue del codo.
2. **Colocación de G2:** 3-4 cm proximal al G1.
3. **Tierra:** Antebrazo medial.
4. **Estimulación:** Antebrazo lateral, 12 cm distal al G1, en la línea que une el tendón del bíceps con la apófisis estiloides radial.
5. **Promediación de 20-30 trazos** (potencial pequeño).

**📊 Valores de Referencia:**
| Parámetro (12 cm) | Normal | Límite anormal |
|---|---|---|
| Latencia Pico | 2.4 - 2.9 ms | >3.2 ms |
| Amplitud (P-P) | 10 - 25 µV | <5 µV |
| VCS | 55 - 70 m/s | <50 m/s |

**🔗 Neuropatías Relacionadas:**
• **Plexopatía braquial — tronco superior (C5-C6):** SNAP reducido junto con debilidad de bíceps, deltoides.
• **Neuropatía aislada del musculocutáneo:** SNAP reducido + debilidad de bíceps/braquial.
• **Parsonage-Turner:** Frecuentemente afecta las fibras del musculocutáneo.`,
              clinicalPearls: [
                'Este SNAP es útil para diferenciar radiculopatía C5-C6 (SNAP NORMAL) de plexopatía del tronco superior (SNAP REDUCIDO).',
                'Es más confiable que el SNAP radial para evaluar C5-C6, porque el radial tiene contribución de C7.',
                'El potencial es relativamente pequeño; la promediación de 20-30 trazos es frecuentemente necesaria.',
                'En Parsonage-Turner: este SNAP puede estar reducido unilateralmente, ayudando a confirmar el diagnóstico.',
              ],
              keyPoints: [
                'Rama sensitiva del musculocutáneo (C5-C6).',
                'Registro: lateral al tendón del bíceps en codo.',
                'Útil para diferenciar radiculopatía (normal) de plexopatía (reducido).',
                'Promediación necesaria (20-30 trazos).',
              ],
            },
            { id: 'medial-cutaneous-forearm', title: 'N. Cutáneo medial del antebrazo',
              content: `El nervio cutáneo medial del antebrazo es una rama directa del cordón medial del plexo braquial (C8-T1, tronco inferior). Inerva la cara medial del antebrazo. Es el nervio sensitivo más confiable para evaluar lesiones del tronco inferior del plexo braquial, más confiable que el SNAP ulnar.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo | 20 Hz |
| Filtro alto | 2 kHz |
| Ganancia | 10-20 µV/div |
| Barrido | 1-2 ms/div |
| Promediación | 20-30 trazos |

**📋 Protocolo paso a paso (Antidrómico):**
1. **Colocación de G1:** Cara medial del antebrazo, a nivel del punto medio entre el pliegue del codo y la muñeca.
2. **Colocación de G2:** 3-4 cm distal al G1.
3. **Tierra:** Dorso de la mano o muñeca.
4. **Estimulación:** 12 cm proximal al G1, sobre la cara medial del brazo, medial al tendón del bíceps en el pliegue del codo.
5. **Promediación de 20-30 trazos** (potencial relativamente pequeño).

**📊 Valores de Referencia:**
| Parámetro (12 cm) | Normal | Límite anormal |
|---|---|---|
| Latencia Pico | 2.4 - 3.0 ms | >3.3 ms |
| Amplitud (P-P) | 8 - 25 µV | <5 µV |
| VCS | 55 - 65 m/s | <50 m/s |

**Valor clínico clave:**
• En una lesión de **C8/T1 preganglionar (radiculopatía)**, este SNAP es **NORMAL** (el ganglio de la raíz dorsal está intacto).
• En una lesión de **tronco inferior (plexopatía)**, este SNAP está **REDUCIDO/AUSENTE** (la lesión es postganglionar).
• Este principio es la PIEDRA ANGULAR de la diferenciación radiculopatía vs. plexopatía para C8-T1.

**🔗 Neuropatías Relacionadas:**
• **Plexopatía braquial — tronco inferior (síndrome de Pancoast):** SNAP ausente + CMAP ulnar y mediano reducidos. Tumor de Pancoast en ápex pulmonar.
• **Thoracic Outlet Syndrome neurogénico verdadero:** SNAP cutáneo medial reducido, atrofia de eminencia tenar.
• **Radiculopatía C8-T1:** SNAP NORMAL (preganglionar). CLAVE diagnóstica.
• **Plexopatía obstétrica (Klumpke):** Lesión del tronco inferior con SNAP reducido.`,
              clinicalPearls: [
                'Este nervio es MÁS CONFIABLE que el SNAP ulnar para localizar plexopatías del tronco inferior, porque NO pasa por el codo (no se confunde con neuropatía ulnar en codo).',
                'REGLA DE ORO: SNAP cutáneo medial del antebrazo reducido + SNAP ulnar reducido + debilidad de mano = lesión de tronco inferior. Si el cutáneo medial es NORMAL, buscar otra explicación (C8-T1 radiculopatía, neuropatía ulnar, STC).',
                'En Thoracic Outlet Syndrome neurogénico: este SNAP reducido + atrofia de eminencia tenar es prácticamente patognomónico.',
                'El potencial es pequeño y requiere promediación. Un potencial ausente bilateralmente puede ser normal en pacientes >70 años.',
                'En sospecha de tumor de Pancoast: un SNAP cutáneo medial del antebrazo ausente con dolor progresivo en brazo medial debe generar solicitud urgente de imagen del ápex pulmonar.',
              ],
              keyPoints: [
                'Rama directa del cordón medial (C8-T1, tronco inferior).',
                'SNAP normal en radiculopatía (preganglionar), reducido en plexopatía (postganglionar).',
                'Más confiable que el ulnar para tronco inferior (no pasa por el codo).',
                'Clave en: Pancoast, TOS neurogénico, plexopatía del tronco inferior.',
                'Promediación 20-30 trazos necesaria.',
              ],
            },
          ]
        },
        {
          id: 'lower-limb-sensory', title: 'Nervios sensitivos del miembro inferior',
          children: [
            { id: 'sural-sensory', title: 'Nervio Sural',
              content: `El nervio sural es el nervio sensitivo más consistente y confiable del miembro inferior. Formado por contribuciones del nervio tibial (cutáneo medial de la pantorrilla) y del peroneo común (ramo comunicante sural), inerva la cara lateral del tobillo y borde lateral del pie. Es el nervio sensitivo de referencia para polineuropatías.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 20 Hz |
| Filtro alto (low-pass) | 2 kHz |
| Ganancia | 10-20 µV/div |
| Barrido (sweep) | 1-2 ms/div |
| Duración del estímulo | 0.1 ms |
| Promediación | 10-20 trazos |

**📋 Protocolo paso a paso (Antidrómico):**
1. **Preparación:** Limpiar piel del tobillo lateral y pantorrilla posterior. Temperatura cutánea ≥30°C (CRÍTICO en MI).
2. **Colocación de G1:** Posterior al maléolo lateral, en el surco entre el maléolo y el tendón de Aquiles.
3. **Colocación de G2:** 3-4 cm distal al G1, sobre el borde lateral del pie.
4. **Tierra:** Dorso del pie.
5. **Estimulación:** Pantorrilla posterior, 14 cm proximal al G1, en la línea media posterior de la pierna. El nervio sural es subcutáneo y fácilmente estimulable.
6. **Promediación:** 10-20 trazos para mejorar la señal.
7. **SIEMPRE comparar con el lado contralateral:** Diferencia de amplitud >50% = significativa.

**📊 Valores de Referencia Completos:**
| Parámetro (14 cm) | Normal | Límite anormal | Significado |
|---|---|---|---|
| Latencia Pico | 3.4 - 4.1 ms | >4.4 ms | Desmielinización o enfriamiento |
| Amplitud (P-P) | 10 - 25 µV | <5 µV | Pérdida axonal sensitiva |
| VCS | 42 - 55 m/s | <40 m/s | Enlentecimiento (desmielinización) |

**🔗 Neuropatías Relacionadas:**
• **Polineuropatía diabética:** El sural es el primer SNAP en afectarse; reducción bilateral simétrica de amplitudes. El hallazgo más temprano de neuropatía diabética sensitiva.
• **Polineuropatía alcohólica/tóxica:** Patrón similar a la diabética. Reducción de amplitud bilateral simétrica.
• **Radiculopatía S1:** SNAP sural NORMAL a pesar de síntomas sensitivos en el pie. Esta es la CLAVE para diferenciar de neuropatía.
• **Neuropatía del sural aislada:** Rara. Puede ocurrir por trauma en pantorrilla, biopsia previa, o compresión.
• **CIDP:** VCS lenta con amplitudes relativamente preservadas si predomina la desmielinización.`,
              clinicalPearls: [
                'Un SNAP sural NORMAL en presencia de síntomas sensitivos en el pie = radiculopatía S1 (lesión preganglionar). Este es uno de los principios más importantes del electrodiagnóstico.',
                'El sural es el nervio sensitivo más importante para screening de polineuropatía: si es normal, es poco probable una polineuropatía significativa por el principio fisiopatológico de degeneración retrógrada o "dying-back" (dependiente de la longitud).',
                'PATRÓN SURAL-SPARING: En GBS y CIDP (neuropatías desmielinizantes), el sural puede estar preservado ("sural sparing") mientras los SNAP de MS están muy afectados. Este patrón sugiere fuertemente etiología desmielinizante adquirida.',
                'COCIENTE SURAL/RADIAL (SRAR): En neuropatías leves/tempranas, comparar la amplitud del Sural con la del Radial sensitivo. Un cociente SRAR < 0.40 (o < 0.21) tiene 90-95% de sensibilidad/especificidad para diagnosticar polineuropatía axonal independiente de la edad.',
                'La amplitud del sural disminuye significativamente con la edad: después de los 60 años, amplitudes de 5-8 µV pueden ser normales y la ausencia bilateral en >75 años no es necesariamente patológica.',
                'TRUCO: El sural es superficial y fácil de estimular. Si no obtienes respuesta, verifica la temperatura (calentar la pantorrilla) y la promediación antes de asumir neuropatía.',
                'En neuropatía de fibras pequeñas: el SNAP sural puede ser NORMAL porque solo evalúa fibras gruesas. La normalidad del sural NO descarta neuropatía de fibras pequeñas.',
              ],
              keyPoints: [
                'El nervio sensitivo de referencia para polineuropatías.',
                'Registro: posterior al maléolo lateral. Distancia: 14 cm.',
                'Amplitud normal: ≥5 µV. Latencia pico: 3.4-4.1 ms.',
                'Sural normal + síntomas sensitivos = radiculopatía S1.',
                'Sural sparing en GBS/CIDP: patrón desmielinizante.',
                'Disminuye con la edad: normal reducido en >60 años.',
              ],
            },
            { id: 'superficial-peroneal-sensory', title: 'Nervio Peroneo Superficial',
              content: `El nervio peroneo superficial (L4-S1) inerva el compartimento lateral de la pierna (peroneos largo y corto) y luego se convierte en un nervio puramente sensitivo que inerva el dorso del pie. Su estudio es esencial para diferenciar neuropatía peronea (pie caído) de radiculopatía L5.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 20 Hz |
| Filtro alto (low-pass) | 2 kHz |
| Ganancia | 10-20 µV/div |
| Barrido (sweep) | 1-2 ms/div |
| Duración del estímulo | 0.1 ms |
| Promediación | 10-20 trazos |

**📋 Protocolo paso a paso (Antidrómico):**
1. **Preparación:** Limpiar piel del dorso del pie y pierna anterolateral. Temperatura ≥30°C.
2. **Colocación de G1:** Dorso del pie, anterior al maléolo lateral, sobre el trayecto del nervio.
3. **Colocación de G2:** 3-4 cm distal al G1.
4. **Tierra:** Tobillo o dorso del pie.
5. **Estimulación:** Pierna anterolateral, 12 cm proximal al G1, en la unión del tercio inferior con el tercio medio de la pierna, donde el nervio se hace superficial.
6. **Promediación de 10-20 trazos.**

**📊 Valores de Referencia Completos:**
| Parámetro (12 cm) | Normal | Límite anormal |
|---|---|---|
| Latencia Pico | 2.8 - 3.4 ms | >3.8 ms |
| Amplitud (P-P) | 10 - 20 µV | <6 µV |
| VCS | 45 - 60 m/s | <40 m/s |

**🔗 Neuropatías Relacionadas:**
• **Neuropatía peronea en cabeza del peroné:** SNAP peroneo superficial REDUCIDO (la lesión es postganglionar) + CMAP peroneo profundo con bloqueo en cabeza peronea.
• **Radiculopatía L5:** SNAP peroneo superficial NORMAL (preganglionar). CLAVE diagnóstica para diferenciación.
• **Síndrome compartimental lateral:** Puede afectar el peroneo superficial selectivamente.
• **Polineuropatía diabética:** Reducción bilateral simétrica.`,
              clinicalPearls: [
                'CLAVE DIAGNÓSTICA del pie caído: Si el SNAP peroneo superficial está REDUCIDO = neuropatía peronea (postganglionar). Si está NORMAL = radiculopatía L5 (preganglionar).',
                'En neuropatía peronea en la cabeza del peroné: el peroneo superficial sensitivo se afecta JUNTO con el peroneo profundo motor. Si solo el motor está afectado, considerar lesión selectiva del peroneo profundo.',
                'El nervio peroneo superficial se hace subcutáneo en el tercio distal de la pierna anterolateral y es palpable. La estimulación en este punto es fiable.',
                'En síndrome compartimental crónico del compartimento lateral: el SNAP puede estar selectivamente reducido antes de que aparezcan síntomas motores.',
              ],
              keyPoints: [
                'Inerva dorso del pie (territorio L5).',
                'Registro: dorso del pie anterior al maléolo lateral.',
                'SNAP reducido en neuropatía peronea; NORMAL en radiculopatía L5.',
                'Clave para DDx del pie caído (pre vs. postganglionar).',
              ],
            },
            { id: 'saphenous-sensory', title: 'Nervio Safeno',
              content: `El nervio safeno es la rama sensitiva terminal del nervio femoral (L3-L4). Inerva la cara medial de la pierna desde la rodilla hasta el maléolo medial. Es el único nervio sensitivo puro del femoral y su estudio es esencial para evaluar neuropatía femoral y plexopatía lumbar.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 20 Hz |
| Filtro alto (low-pass) | 2 kHz |
| Ganancia | 5-10 µV/div (potencial MUY pequeño) |
| Barrido (sweep) | 1-2 ms/div |
| Duración del estímulo | 0.1 ms |
| Promediación | 30-50 trazos (INDISPENSABLE) |

**📋 Protocolo paso a paso (Antidrómico):**
1. **Preparación:** Limpiar piel del tobillo medial y pierna medial. Temperatura ≥30°C.
2. **Colocación de G1:** Anterior al maléolo medial, en la cara anteromedial del tobillo.
3. **Colocación de G2:** 3-4 cm distal al G1.
4. **Tierra:** Dorso del pie.
5. **Estimulación:** Borde medial de la tibia, 14 cm proximal al G1. El nervio corre junto a la vena safena magna.
6. **Promediación INTENSIVA:** Promediar 30-50 trazos. Este potencial es muy pequeño y frecuentemente difícil de obtener.
7. **TIPS para obtener el potencial:** Reducir impedancia agresivamente, usar gel fresco, calentar la pierna, y reducir los filtros si hay mucho ruido.

**📊 Valores de Referencia:**
| Parámetro (14 cm) | Normal | Límite anormal |
|---|---|---|
| Latencia Pico | 3.4 - 4.0 ms | >4.4 ms |
| Amplitud (P-P) | 4 - 12 µV | <3 µV |
| VCS | 42 - 55 m/s | <40 m/s |

**🔗 Neuropatías Relacionadas:**
• **Neuropatía femoral:** SNAP safeno reducido + CMAP femoral reducido + debilidad de cuádriceps.
• **Neuropatía safena aislada:** Puede ocurrir por atrapamiento en el canal de Hunter (aductor) en la cara medial del muslo.
• **Radiculopatía L3-L4:** SNAP safeno NORMAL (preganglionar). Diferencia con neuropatía femoral.
• **Plexopatía lumbar:** SNAP safeno reducido si la lesión involucra el plexo lumbar (postganglionar).`,
              clinicalPearls: [
                'El SNAP safeno es un potencial MUY PEQUEÑO (4-12 µV); la promediación intensiva (30-50 trazos) es INDISPENSABLE. No declares ausencia sin al menos 50 trazos promediados.',
                'LOCALIZACIÓN del atrapamiento: El nervio safeno puede comprimirse en el canal de Hunter (canal del aductor), produciendo dolor en la cara medial de la rodilla y pierna. Este diagnóstico se confunde frecuentemente con patología de rodilla.',
                'En neuropatía femoral iatrogénica (post-cirugía de cadera): el SNAP safeno reducido confirma lesión del femoral, no solo una radiculopatía L3-L4.',
                'Un SNAP safeno bilateral ausente puede ser normal en pacientes >65 años y obesos. Siempre considerar el contexto clínico.',
                'Mnemotécnica: el nervio safeno acompaña a la vena safena magna. Buscar la vena safena para localizar el trayecto del nervio.',
              ],
              keyPoints: [
                'Rama sensitiva del femoral (L3-L4).',
                'Potencial MUY pequeño: promediación 30-50 trazos obligatoria.',
                'Registro: anterior al maléolo medial. Distancia: 14 cm.',
                'SNAP reducido en neuropatía femoral; NORMAL en radiculopatía L3-L4.',
                'Atrapamiento en canal de Hunter: dolor medial de rodilla/pierna.',
              ],
            },
            { id: 'lateral-femoral-cutaneous', title: 'Nervio Femorocutáneo Lateral',
              content: `El nervio femorocutáneo lateral (L2-L3) es un nervio sensitivo puro que inerva la cara anterolateral del muslo. Su estudio es crucial para el diagnóstico de la Meralgia Parestésica (atrapamiento bajo el ligamento inguinal). Es el nervio sensitivo puro más largo del organismo.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 20 Hz |
| Filtro alto (low-pass) | 2 kHz |
| Ganancia | 5-10 µV/div (potencial pequeño) |
| Barrido (sweep) | 1-2 ms/div |
| Duración del estímulo | 0.1-0.2 ms |
| Promediación | 30-50 trazos |

**📋 Protocolo paso a paso:**
1. **Preparación:** Limpiar piel del muslo anterolateral y zona inguinal. Temperatura ≥30°C.
2. **Anatomía de referencia:** Palpar la espina ilíaca anterosuperior (EIAS). El nervio emerge 1-2 cm medial a la EIAS, bajo el ligamento inguinal.
3. **Colocación de G1:** 10-12 cm distal a la EIAS, sobre la cara anterolateral del muslo, en el trayecto del nervio.
4. **Colocación de G2:** 3-4 cm distal al G1.
5. **Estimulación:** 1-2 cm medial e inferior a la EIAS, presionando firmemente.
6. **Promediación:** 30-50 trazos (potencial muy pequeño).
7. **SIEMPRE comparar con el lado contralateral:** La comparación lado a lado es MÁS IMPORTANTE que los valores absolutos.

**📊 Valores de Referencia:**
| Parámetro | Normal | Límite anormal |
|---|---|---|
| Latencia Pico | 2.4 - 2.8 ms | >3.2 ms |
| Amplitud | 5 - 20 µV | <3 µV |
| Diferencia lado a lado | <50% | >50% = significativo |

**🔗 Neuropatías Relacionadas:**
• **Meralgia Parestésica:** Atrapamiento del femorocutáneo lateral bajo el ligamento inguinal. Causa: obesidad, embarazo, cinturones apretados, pantalones ajustados, cirugía pélvica.
• **Plexopatía lumbar L2-L3:** SNAP puede estar reducido si la lesión es postganglionar.
• **Neuropatía post-quirúrgica:** Puede lesionarse durante cosecha de injerto óseo de cresta ilíaca anterior.`,
              clinicalPearls: [
                'Es MUY COMÚN que el potencial esté ausente bilateralmente en pacientes con obesidad significativa sin patología. La COMPARACIÓN LADO A LADO es el método diagnóstico más confiable.',
                'MERALGIA PARESTÉSICA: dolor/quemazón/parestesias en la cara anterolateral del muslo. Es la mononeuropatía por atrapamiento más frecuente del MI después de la peronea. Factores de riesgo: obesidad, embarazo, diabetes, uso de cinturones duty belt (policías).',
                'TRUCO DIAGNÓSTICO: Si el potencial está ausente bilateralmente, la comparación no es posible. En ese caso, el diagnóstico de meralgia parestésica se basa en la clínica (territorio típico + ausencia de debilidad motora).',
                'En pacientes post-cirugía con cosecha de cresta ilíaca: siempre evaluar este nervio si hay hipestesia del muslo postoperatorio.',
                'La pérdida de peso (>10 kg) frecuentemente resuelve la meralgia parestésica. Documentar valores basales para seguimiento.',
              ],
              keyPoints: [
                'Nervio sensitivo puro (L2-L3). Inerva muslo anterolateral.',
                'Diagnóstico de Meralgia Parestésica (atrapamiento inguinal).',
                'Potencial pequeño: promediación 30-50 trazos.',
                'Comparación lado a lado: más importante que valores absolutos.',
                'Puede estar ausente bilateralmente en obesidad sin patología.',
              ],
            },
            { id: 'plantar-nerves', title: 'Nervio Plantar (medial y lateral)',
              content: `Los nervios plantares medial y lateral son las ramas terminales del nervio tibial en el pie. El plantar medial inerva los 3.5 dedos mediales y es el homólogo del nervio mediano en la mano. El plantar lateral inerva los 1.5 dedos laterales y es el homólogo del nervio ulnar. Son esenciales para el diagnóstico del Síndrome del Túnel Tarsal.

**⚙️ Configuración del EMG:**
| Parámetro | Valor recomendado |
|---|---|
| Filtro bajo (high-pass) | 20 Hz |
| Filtro alto (low-pass) | 2 kHz |
| Ganancia | 5-10 µV/div (potenciales MUY pequeños) |
| Barrido (sweep) | 1-2 ms/div |
| Duración del estímulo | 0.1 ms |
| Promediación | 50-100 trazos (INTENSIVA) |

**📋 Protocolo paso a paso:**
1. **Colocación de G1 (plantar medial):** Base del 1er dedo (hallux), electrodo de anillo.
2. **Colocación de G1 (plantar lateral):** Base del 4to o 5to dedo, electrodo de anillo.
3. **G2:** 3-4 cm distal al G1.
4. **Tierra:** Dorso del pie.
5. **Estimulación:** Detrás del maléolo medial, entre el maléolo y el tendón de Aquiles (misma posición que la estimulación tibial motora).
6. **Promediación INTENSIVA:** 50-100 trazos. Estos son los potenciales sensitivos más difíciles de obtener.
7. **COMPARAR plantar medial vs. lateral:** En síndrome del túnel tarsal, puede haber afección selectiva de una rama.

**📊 Valores de Referencia:**
| Parámetro | Plantar Medial | Plantar Lateral |
|---|---|---|
| Latencia Pico | 3.0 - 3.6 ms | 3.2 - 3.8 ms |
| Amplitud | 2 - 8 µV | 1 - 5 µV |
| Ausencia | Anormal | Puede ser normal en >60 años |

**🔗 Neuropatías Relacionadas:**
• **Síndrome del Túnel Tarsal:** Compresión del tibial posterior bajo el retináculo flexor. Puede afectar selectivamente plantar medial, plantar lateral, o ambos.
• **Neuroma de Morton:** Afecta el nervio interdigital plantar (generalmente entre 3er y 4to metatarso). Los nervios plantares proximales suelen ser normales.
• **Polineuropatía distal temprana:** Los plantares pueden estar ausentes cuando el sural aún es normal (sitio más distal del MI).`,
              clinicalPearls: [
                'Los nervios plantares son los potenciales sensitivos MÁS DIFÍCILES de obtener. Requieren promediación de 50-100 trazos, impedancia baja, y excelente técnica.',
                'En síndrome del túnel tarsal: comparar el plantar medial vs. lateral ayuda a localizar qué rama está comprimida. Si solo el plantar lateral está afectado, la compresión puede ser más distal.',
                'TRUCO: Reducir el filtro bajo (high-pass) a 10-15 Hz puede mejorar la detección de estos potenciales pequeños, aunque introduce más artefacto de movimiento.',
                'En pacientes >60 años: el plantar lateral puede ser fisiológicamente ausente. El plantar medial es más confiable como marcador de patología.',
                'El neuroma de Morton produce dolor interdigital (no plantar difuso). Los nervios plantares medial y lateral suelen ser normales en Morton; se necesitan estudios interdigitales específicos.',
              ],
              keyPoints: [
                'Ramas terminales del tibial. Plantar medial (3.5 dedos) y lateral (1.5 dedos).',
                'Potenciales MUY pequeños: promediación 50-100 trazos.',
                'Diagnóstico de síndrome del túnel tarsal.',
                'Comparar medial vs. lateral para localización.',
                'Plantar lateral puede estar ausente normalmente en >60 años.',
              ],
            },
          ]
        },
        { id: 'pre-post-ganglionic', title: 'Significado clínico: lesiones pre vs. postganglionares', content: `Principio clave: en lesiones preganglionares (radiculopatías), el cuerpo celular en el ganglio de la raíz dorsal está intacto, por lo tanto el SNAP se preserva a pesar de la clínica sensitiva.
En lesiones postganglionares (plexopatía, neuropatía), el SNAP disminuye o desaparece. Este principio es fundamental para la localización electrodiagnóstica.` },
      ]
    },
    {
      id: 'mixed-conduction', title: 'Neuroconducción Mixta', titleEn: 'Mixed Nerve Conduction',
      children: [
        { id: 'mixed-recording', title: 'Registro de fibras motoras y sensitivas combinadas',
          content: `Los estudios de neuroconducción mixta registran la actividad combinada de fibras motoras y sensitivas de un nervio, produciendo un potencial de acción de nervio mixto (MNAP).

**Técnica:**
Se estimula el nervio en un sitio donde contenga tanto fibras motoras como sensitivas y se registra en otro punto del mismo tronco nervioso. A diferencia de la NCS motora (que registra del músculo) o sensitiva (que registra sobre fibras puramente sensitivas), aquí se registra directamente del tronco nervioso completo.

**Indicaciones:**
• Evaluación de segmentos proximales del nervio donde los estudios convencionales son difíciles.
• Síndrome del túnel carpiano: el estudio palmar mixto del mediano es más sensible que la NCS sensitiva convencional.
• Evaluación de plexopatías y radiculopatías.

**Ventajas:**
• Mayor amplitud que los SNAP puros (contribuyen más fibras).
• Permite evaluar segmentos más proximales.
• Útil cuando los SNAP están ausentes.`,
          clinicalPearls: [
            'El estudio de nervio mixto palmar del mediano es uno de los estudios más sensibles para STC leve/temprano.',
          ],
          keyPoints: [
            'MNAP: potencial combinado de fibras motoras y sensitivas.',
            'Mayor amplitud que SNAP, útil en segmentos proximales.',
            'Estudio palmar mixto: altamente sensible para STC temprano.',
          ],
        },
        { id: 'palmar-mixing', title: 'Palmar mixing study',
          content: `El estudio palmar mixto (palmar mixed nerve study) es una técnica especializada para evaluar el segmento del nervio mediano a través del túnel carpiano con alta sensibilidad.

**Técnica:**
• Estimulación: palma de la mano (sobre el nervio mediano).
• Registro: muñeca (sobre el nervio mediano proximal al túnel carpiano).
• Distancia: 8 cm.
• Se compara con el mismo estudio del nervio ulnar ipsilateral (misma distancia palma-muñeca).

**Criterios diagnósticos de STC:**
• Diferencia de latencia palmar mediano-ulnar >0.3 ms es diagnóstica de STC.
• Es más sensible que la NCS sensitiva de rutina porque evalúa solo el segmento donde ocurre la compresión.

**Cascada diagnóstica del STC (de más a menos sensible):**
1. Estudio comparativo mediano-ulnar palmar mixto
2. NCS sensitiva mediano dedo 4 (comparativa con ulnar dedo 4)
3. NCS sensitiva mediano convencional (dedo 2/3)
4. Latencia motora distal del mediano`,
          clinicalPearls: [
            'En STC leve con NCS sensitiva de rutina normal, el palmar mixing study puede ser la clave diagnóstica. Es el estudio más sensible disponible.',
          ],
          keyPoints: [
            'Estimulación palmar, registro en muñeca, comparación mediano vs. ulnar.',
            'Diferencia >0.3 ms = diagnóstico de STC.',
            'Más sensible que NCS sensitiva de rutina para STC temprano.',
          ],
        },
        { id: 'ia-afferents', title: 'Aferentes Ia (fibras propioceptivas)',
          content: `Las fibras Ia son las aferentes propioceptivas más gruesas y rápidas que se originan en los husos musculares. Son las responsables del componente aferente del reflejo miotático (reflejo de estiramiento).

**Características:**
• Diámetro: 12-20 µm (las más gruesas del organismo).
• Velocidad de conducción: 70-120 m/s.
• Contribuyen al reflejo H y a la onda F.
• En estudios de nervio mixto, las fibras Ia contribuyen al componente más rápido del potencial.

**Relevancia clínica:**
• El reflejo H del sóleo (arco aferente del tibial) evalúa la integridad del arco reflejo S1 (incluye fibras Ia).
• La pérdida selectiva de fibras gruesas (incluyendo Ia) reduce la VC y afecta propiocepción antes que el tacto fino.`,
          keyPoints: [
            'Fibras Ia: las más gruesas (12-20 µm, 70-120 m/s).',
            'Arco aferente del reflejo H y reflejo miotático.',
            'Su pérdida causa ataxia sensitiva y pérdida propioceptiva.',
          ],
        },
      ]
    },
    {
      id: 'technical-factors', title: 'Factores Técnicos y Artefactos', titleEn: 'Technical Factors and Artifacts',
      children: [
        { id: 'temperature-effect', title: 'Efecto de la temperatura',
          content: `La temperatura cutánea es el factor técnico extrínseco que más afecta los resultados de la NCS. Debe mantenerse ≥32°C en MS y ≥30°C en MI.

**Efectos del enfriamiento (por cada 1°C de descenso):**
| Parámetro | Cambio esperado | Mecanismo |
|---|---|---|
| Latencias | Prolongación ~0.2 ms/°C | Retardo en apertura de canales Na+ |
| Velocidad | Enlentecimiento ~2.0 m/s/°C | Menor velocidad de conducción de la fibra |
| Amplitud | AUMENTA (paradójico) | Menor cancelación de fase por desincronía |
| Duración | Aumenta (ensanchamiento) | Dispersión de velocidades por frío |

**Consecuencia clínica:** El enfriamiento simula un **patrón desmielinizante** (latencias largas y velocidades lentas). Siempre calentar la extremidad o aplicar factores de corrección antes de interpretar.`,
        },
        { id: 'age-height', title: 'Efecto de la edad y estatura', content: `Con la edad: amplitudes disminuyen, latencias se prolongan ligeramente, velocidades disminuyen modestamente.
Con mayor estatura: latencias de onda F más largas, velocidades de conducción ligeramente menores en segmentos distales. Usar tablas normativas ajustadas a la edad.` },
        { id: 'stimulus-artifact', title: 'Artefacto de estímulo', content: `Acoplamiento eléctrico entre el estimulador y el amplificador.
Se reduce con: electrodo de tierra entre estimulación y registro, rotación del ánodo, reducción de la impedancia de la piel, limpieza del gel conductor.` },
        { id: 'costimulation', title: 'Coestimulación y anastomosis',
          content: `La coestimulación ocurre cuando el estímulo eléctrico activa un nervio adyacente además del nervio objetivo, produciendo un CMAP contaminado por la respuesta del músculo inervado por el nervio no deseado.

**Sitios comunes de coestimulación:**
• **Fosa antecubital:** estimulación del mediano puede coestimular el ulnar (y viceversa) por su proximidad.
• **Hueco poplíteo:** el tibial y el peroneo corren juntos como nervio ciático.
• **Muñeca:** mediano y ulnar están separados por pocos mm.

**Cómo identificarla:**
• Cambio súbito de morfología del CMAP al estimular en un punto proximal.
• Aumento inesperado de amplitud con estimulación proximal.
• Movimiento de músculos no esperados con la estimulación.

**Solución:**
• Reducir la intensidad al mínimo supramáximo.
• Rotar el estimulador para alejarlo del nervio adyacente.
• Mover el punto de estimulación ligeramente.`,
          clinicalPearls: [
            'Si la amplitud del CMAP AUMENTA inexplicablemente al estimular proximalmente, sospecha coestimulación antes que anomalía anatómica.',
          ],
          keyPoints: [
            'Coestimulación: activación involuntaria de nervio adyacente.',
            'Sitios frecuentes: fosa antecubital, hueco poplíteo, muñeca.',
            'Solución: reducir intensidad, rotar estimulador.',
          ],
        },
        { id: 'electrode-errors', title: 'Errores comunes en la colocación de electrodos',
          content: `Los errores en la colocación de electrodos son la causa más frecuente de resultados atípicos y deben descartarse antes de interpretar cualquier hallazgo como patológico.

**Errores más comunes y cómo reconocerlos:**

1. **G1 fuera del punto motor:** El CMAP muestra deflexión inicial positiva. Solución: reposicionar G1 hasta obtener deflexión negativa limpia.

2. **G2 sobre tejido activo:** Contaminación del registro con potenciales de músculos cercanos. Solución: ubicar G2 sobre tendón o hueso.

3. **Tierra mal posicionada:** Ubicar la tierra entre G1 y G2 (en vez de entre estímulo y registro) aumenta el artefacto de estímulo.

4. **Inversión cátodo-ánodo:** Reduce amplitud y prolonga latencia.

5. **Distancia incorrecta:** No medir la distancia real o medir con codo extendido (para ulnar) produce errores en la VCM.

6. **Impedancia alta:** Piel sucia, mal contacto, gel seco → registros ruidosos.

**Regla de oro:**
Antes de reportar un resultado anormal, verifica la técnica. La mayoría de los resultados "atípicos" son errores técnicos.`,
          clinicalPearls: [
            'El 80% de los \"resultados anormales\" en principiantes se resuelven corrigiendo la técnica. Siempre piensa primero: \"\u00bfEs técnico?\" antes de interpretar como patológico.',
          ],
          keyPoints: [
            'Deflexión inicial positiva = G1 fuera del punto motor.',
            'Siempre verificar técnica antes de interpretar como anormal.',
            'Impedancia alta = registros ruidosos = mala calidad.',
            'Regla: \"Si es atípico, primero descarta el error técnico.\"',
          ],
        },
        { id: 'martin-gruber-riche-cannieu', title: 'Anomalías anatómicas: Martin-Gruber y Riche-Cannieu', content: 'Anastomosis de Martin-Gruber (15-30% de la población): fibras motoras del mediano cruzan al ulnar en el antebrazo. Puede causar: CMAP del mediano en muñeca con componente positivo inicial, CMAP del ulnar mayor en codo que en muñeca. Riche-Cannieu: comunicación palmar entre mediano y ulnar.' },
      ]
    },
    {
      id: 'pathological-phenomena', title: 'Fenómenos Patológicos en Neuroconducción', titleEn: 'Pathological Phenomena',
      children: [
        { id: 'conduction-block', title: 'Bloqueo de conducción: definición y criterios',
          content: `El bloqueo de conducción (BC) es el hallazgo electrofisiológico distintivo de la desmielinización focal activa. Se define como el fallo parcial o total en la propagación de impulsos en un sitio específico de un axón estructuralmente intacto.

**Criterios de Bloqueo de Conducción Parcial (EAN/PNS 2021):**
• Caída de AMPLITUD del CMAP >50% entre estimulación distal vs. proximal.
• Caída de ÁREA del CMAP >50% entre estimulación distal vs. proximal.
• En nervio mediano, ulnar o peroneo, con aumento de duración <30%.

**¿Por qué <30% de aumento de duración?**
Para diferenciarlo de la **dispersión temporal**. Si el CMAP se ensancha mucho, la caída de amplitud puede deberse a la cancelación de fase entre fibras lentas y rápidas (pseudo-bloqueo), no a un fallo real de la conducción.

**Significado clínico:**
El bloqueo de conducción indica una lesión **adquirida y potencialmente reversible**. Es el sello de enfermedades como el Síndrome de Guillain-Barré, la CIDP y la Neuropatía Motora Multifocal (NMM).`,
        },
        { id: 'temporal-dispersion', title: 'Dispersión temporal',
          content: `La dispersión temporal refleja desmielinización segmentaria heterogénea a lo largo de un nervio.

**Definición:**
Aumento de la DURACIÓN de la fase negativa del CMAP >30% al comparar estimulación proximal vs. distal.

**Fisiopatología:**
Diferentes fibras dentro del mismo nervio están afectadas en grados distintos. Las fibras más desmielinizadas conducen mucho más lento que las menos afectadas. Al estimular en un punto proximal, los potenciales de cada fibra llegan al músculo en tiempos muy diferentes, "dispersando" el CMAP total.

**Cancelación de fase:**
La dispersión temporal asocia una caída de amplitud (pseudo-bloqueo). Al ensancharse el potencial, las fases negativas de las fibras lentas se superponen con las fases positivas de las fibras rápidas, cancelándose mutuamente y reduciendo la amplitud sin que haya pérdida real de conducción o de axones.`,
        },
        { id: 'axonal-vs-demyelinating', title: 'Patrón axonal vs. desmielinizante',
          content: `La distinción entre daño axonal y desmielinización primaria es la decisión interpretativa más importante en neurofisiología clínica.

| Característica | Patrón Axonal | Patrón Desmielinizante |
|---|---|---|
| Amplitud (CMAP/SNAP) | ↓↓ Reducida (proporcional a pérdida) | Normal o ↓ leve (excepto bloqueo) |
| Latencias (LMD/Onda F) | Normales o ↑ leve (≤120% LSN) | ↑↑ Muy prolongadas (>150% LSN) |
| Velocidades (VCM/VCS) | Normales o ↓ leve (>75% LIN) | ↓↓ Muy lentas (≤70% LIN) |
| Bloqueo / Dispersión | Ausente | Presente |
| Reclutamiento (EMG) | Reducido (neurogénico) | Inicialmente normal |
| Pronóstico típico | Lento (regeneración 1mm/día) | Rápido (remielinización semanas) |`,
        },
      ]
    },
    {
      id: 'nerve-conduction-special', title: 'Variantes Anatómicas y Técnicas Especiales',
      children: [
        {
          id: 'martin-gruber',
          title: 'Anastomosis de Martin-Gruber (AMG)',
          content: `La Anastomosis de Martin-Gruber (AMG) es la variante de inervación anómala más común del miembro superior (prevalencia 15-30%). Consiste en el cruce de fibras motoras desde el nervio mediano hacia el nervio cubital (ulnar) en el antebrazo. Es asintomática, pero **causa enormes errores de interpretación electrofisiológica** si no se reconoce.

### 1. Fisiología y Anatomía
Las fibras motoras (típicamente originadas del nervio interóseo anterior) abandonan el mediano en el tercio proximal del antebrazo y se unen al cubital distalmente (5-12 cm debajo del epicóndilo medial). Esto significa que músculos habitualmente inervados por el cubital reciben axones que viajaron por el mediano en el codo, pero por el cubital en la muñeca.

### 2. Tipos de AMG (Clasificación de Oh)
Según el músculo de destino final en la mano:
*   **Tipo I:** Destino hipotenar (Abductor del quinto dedo - AQD).
*   **Tipo II (Más común, >80%):** Destino Primer Interóseo Dorsal (PID).
*   **Tipo III:** Destino tenar (Aductor del pulgar o Abductor corto del pulgar).

### 3. Detección Electrofisiológica y "Falso Bloqueo"
La AMG se detecta incidentalmente durante la neuroconducción motora de rutina, generando patrones anómalos:

**A. En AMG Tipos I y II (Las más comunes)**
Al estudiar el nervio **cubital** registrando en el AQD o PID:
*   **Estimulación en muñeca:** Amplitud normal (se activan todas las fibras, las propias del cubital y las anómalas que ya se unieron).
*   **Estimulación bajo el codo:** Amplitud **SIGNIFICAMENTE MENOR** (>10-20% caída). Esto ocurre porque el estímulo es proximal al cruce y no activa las fibras anastomóticas (que viajan por el mediano a ese nivel).
*   **Peligro Diagnóstico:** Imita perfectamente un **bloqueo de conducción motor en el antebrazo**, lo que puede llevar a diagnósticos erróneos de neuropatía motora multifocal o CIDP, y tratamientos injustificados.

**B. Falsa neuropatía cubital en el codo (NCC)**
Si se estimula por debajo del codo pero muy distalmente (activando la anastomosis), y luego sobre el codo (donde las fibras viajan en el mediano y no se activan), se observa una caída de amplitud a través del codo, simulando una compresión en el surco ulnar que podría terminar en cirugía innecesaria.

**C. En AMG Tipo III + Síndrome de Túnel Carpiano (STC) severo**
Al estudiar el nervio **mediano**:
*   El estímulo proximal (codo) tiene **MAYOR** amplitud que el distal (muñeca).
*   La velocidad de conducción motora en el antebrazo aparece **falsamente muy rápida (>70 m/s)** o incluso con latencia proximal más corta que la distal, debido a que las fibras anastomóticas evitan el túnel carpiano viajando por el cubital.
*   Aparece una deflexión inicial positiva ("dip") al estimular en el codo.

### 4. Técnica de Corrección (Regla de Oro)
Ante cualquier caída de amplitud del cubital >10% en el antebrazo:
1.  **NO asuma bloqueo de conducción.**
2.  Mantenga el registro en el músculo cubital (AQD o PID).
3.  Estimule el nervio **mediano** en la fosa antecubital.
4.  Si se obtiene un CMAP claro, y su amplitud es igual a la caída de amplitud observada en el estudio del cubital, la AMG queda confirmada.`,
          clinicalPearls: [
            'La prevalencia de AMG es mucho mayor (hasta 50-60%) en pacientes referidos por Síndrome del Túnel Carpiano.',
            'Siempre que diagnostique un "bloqueo de conducción" en el nervio cubital en el antebrazo, debe descartar obligatoriamente una AMG estimulando el mediano.',
            'Para evitar falsas neuropatías cubitales en codo, asegúrese de que el estímulo por debajo del codo sea estrictamente a 3 cm distal al epicóndilo medial (evitando estimular distal a la anastomosis).',
            'Para medir la latencia proximal del mediano cuando hay AMG Tipo III, coloque el marcador en el punto donde la señal cruza la línea de base (baseline crossing) ignorando el "dip" inicial positivo.'
          ],
          keyPoints: [
            'Cruce motor: Mediano a Cubital en el antebrazo.',
            'Tipo más común: Hacia el primer interóseo dorsal (PID).',
            'Simula: Bloqueo de conducción cubital en antebrazo.',
            'Solución: Estimular el mediano en el codo registrando en músculo cubital.'
          ]
        },
        {
          id: 'inching-technique',
          title: 'Técnica de Inching Segmentario',
          content: `La técnica de inching segmentario (o estudios de segmentos cortos) consiste en estimular un nervio periférico a intervalos muy pequeños y exactos (1 a 2 cm) a lo largo de su trayecto anatómico. Su objetivo es identificar variaciones abruptas de latencia o amplitud para **localizar con precisión milimétrica** el sitio de una compresión o desmielinización focal.

### 1. Protocolo de Ejecución (Ej. Nervio Cubital en Codo)
*   **Mapeo del nervio:** Usando corriente submáxima, se estimula alrededor de la zona sospechosa. El punto de mayor amplitud del CMAP dicta el trayecto anatómico real del nervio, que se marca en la piel.
*   **Marcación de segmentos:** Se marca el punto "cero" (ej. epicóndilo medial/surco cubital). A partir de ahí, se dibujan líneas cada 1 cm, desde 4 cm distal hasta 4-6 cm proximal al codo.
*   **Estimulación en cascada:** Se aplica estimulación supramáxima centímetro a centímetro, de distal a proximal. Las ondas se superponen en pantalla (rastered display) para visualizar el cambio milisegundo a milisegundo.

### 2. Criterios de Anormalidad
La clave no es la velocidad absoluta promedio, sino el salto brusco entre dos segmentos adyacentes de 1 cm:
*   **Nervio Cubital (Codo):** Un "salto" abrupto de latencia (ej. > 0.5 - 0.8 ms en un solo centímetro) o una caída drástica de amplitud/área del CMAP localiza el bloqueo o enlentecimiento focal. Ayuda a distinguir compresión en el surco retrocondíleo vs. aponeurosis humerocubital.
*   **Nervio Mediano (Muñeca):** En condiciones normales, la latencia aumenta ~0.16 a 0.21 ms/cm. Un incremento de **≥0.4 ms** en un solo segmento de 1 cm es anormal y localiza el atrapamiento focal en el STC.

### 3. Consideraciones Técnicas y Pitfalls
*   **Precisión de medida:** Un error de 2-3 mm al medir en piel causa márgenes de error enormes al calcular velocidades en segmentos de 10 mm. Use calibradores rígidos.
*   **Difusión de estímulo (Coestimulación):** Usar demasiada corriente despolarizará el nervio centímetros más allá del cátodo, distorsionando la latencia verdadera. El mapeo previo reduce la necesidad de corrientes excesivas.
*   **Subluxación del nervio:** Al flexionar el codo, el nervio cubital puede saltar sobre el epicóndilo medial, haciendo que la distancia medida con cinta métrica sea mayor que el nervio real. El inching evita la falsa medición de velocidad (falso negativo) al seguir el nervio real.`,
          clinicalPearls: [
            'El inching es el estándar de oro neurofisiológico para localizar con precisión la neuropatía cubital en el codo cuando los estudios de rutina (que miden 10 cm de golpe) solo muestran pérdida axonal inespecífica o bloqueos dudosos.',
            'Un incremento de latencia ≥0.4 ms a través de 1 cm en el túnel carpiano confirma la compresión focal.',
            'Cuidado con el "artefacto de estímulo": al estimular a distancias cortas, el estímulo puede oscurecer el inicio del CMAP. Separe bien los cables del estimulador y de registro.'
          ],
          keyPoints: [
            'Estímulos seriados cada 1 cm.',
            'Busca saltos de latencia o caídas de amplitud abruptas.',
            'Invaluable para Neuropatía Cubital en codo (precisa el punto exacto).',
            'Medición rigurosa: errores de 1 mm afectan drásticamente el cálculo.'
          ]
        },
        {
          id: 'palm-studies',
          title: 'Estudios en Palma (Nervio Mixto Mediano vs. Cubital)',
          content: `El estudio de conducción de nervio mixto en la palma es una técnica de comparación interna altamente sensible para el diagnóstico del Síndrome del Túnel Carpiano (STC) muy temprano o leve.

### 1. Técnica de Realización (Distancia Fija 8 cm)
El montaje se basa en estimular el nervio en la palma y registrar la respuesta ortodrómica en la muñeca, usando una distancia idéntica y estricta de **8 cm** para ambos nervios:
*   **Nervio Mediano Palmar Mixto:**
    *   **Registro (G1):** En la muñeca (entre tendones del flexor radial del carpo y palmar largo).
    *   **Estimulación:** En la palma, a 8 cm exactos de G1, sobre la línea hacia el espacio entre los dedos 2º y 3º.
*   **Nervio Cubital Palmar Mixto (Control Interno):**
    *   **Registro (G1):** En la muñeca medial (adyacente al flexor cubital del carpo).
    *   **Estimulación:** En la palma, a 8 cm exactos de G1, sobre la línea hacia el espacio entre los dedos 4º y 5º.

### 2. Fundamento Fisiológico: ¿Por qué es superior?
Esta técnica supera a los estudios de rutina (sensitivos de 14 cm a los dedos) por tres razones:
1.  **Evaluación de Fibras Tipo Ia:** Los estudios de nervio mixto evalúan las aferentes sensitivas del músculo (Ia). Al ser las más grandes y de conducción más rápida, son las primeras fibras en verse afectadas por compresión. Los estudios rutinarios no evalúan estas fibras.
2.  **Menor "Dilución" del Enlentecimiento:** En un segmento corto de 8 cm, el tiempo de conducción corresponde casi exclusivamente al trayecto a través del túnel carpiano. En estudios largos de 14 cm, el segmento normal (muñeca a dedo) "diluye" matemáticamente el retraso.
3.  **Neutralización de Variables:** Usar el cubital de la misma mano como control interno elimina sesgos por edad, temperatura o polineuropatías sistémicas.

### 3. Valores de Referencia y Criterios Diagnósticos
*   **Valor Normal (Mediano vs. Cubital):** La diferencia de latencia de pico debe ser **≤ 0.3 ms**.
*   **Confirmación de Patología (STC):** Una diferencia de latencia de pico **≥ 0.4 ms** es categóricamente anormal y confirma el STC, incluso si todos los demás estudios rutinarios son normales.
*   **Latencia Absoluta:** La latencia de pico normal para ambos a 8 cm es **≤ 2.2 ms**.`,
          clinicalPearls: [
            'Este es el estudio electrofisiológico más sensible para STC. Debe utilizarse cuando la clínica es muy sugerente pero el SNAP mediano convencional del dedo 2 o 3 es normal.',
            'Un error de 1 cm al medir la distancia en la palma puede causar una falsa diferencia de latencia de 0.2 ms. La medición con cinta o calibrador debe ser meticulosa.',
            'Al estimular, evite usar intensidades muy altas para no co-estimular el nervio adyacente en la palma, lo cual podría anular artificialmente la diferencia de latencia.'
          ],
          keyPoints: [
            'Estudio de nervio mixto ortodrómico (palma a muñeca).',
            'Distancia estándar estricta: 8 cm.',
            'Evalúa las fibras gruesas Ia, las primeras en afectarse.',
            'Diferencia de latencia pico ≥ 0.4 ms confirma STC.'
          ]
        },
        {
          id: 'lumbrical-interosseous',
          title: 'Estudio Lumbrical-Interóseo (L2-INT1)',
          content: `El estudio comparativo motor entre el segundo lumbrical (mediano) y el primer interóseo palmar (cubital) es una de las técnicas más robustas para diagnosticar el Síndrome del Túnel Carpiano (STC) cuando las respuestas convencionales están ausentes (STC severo o polineuropatía).

### 1. ¿Por qué es tan útil en STC Severo?
*   **"Lumbrical Sparing":** Las fibras motoras del nervio mediano que inervan el segundo lumbrical (2L) son notablemente más resistentes a la compresión mecánica y a la isquemia dentro del túnel carpiano que las fibras que van al abductor corto del pulgar (tenar) o las fibras sensitivas.
*   **Ideal cuando "no hay respuesta":** En STC severo, los potenciales sensitivos y la respuesta motora tenar pueden estar ausentes. Sin embargo, el 2L frecuentemente se preserva, permitiendo obtener una respuesta motora del mediano y calcular una latencia.
*   **Polineuropatías:** Dado que los potenciales motores de mano suelen preservarse más tiempo que los sensitivos en polineuropatías, este estudio es el control interno óptimo cuando todos los sensitivos están ausentes.

### 2. Técnica de Realización (Montaje Único)
Aprovecha una ventaja anatómica: el segundo lumbrical está físicamente encima del primer interóseo palmar. Se usa una sola posición de registro para evaluar ambos nervios:
*   **Registro (G1):** Lateral respecto al punto medio del tercer metacarpiano (en la palma). Mueva ligeramente el electrodo hasta obtener la inflexión inicial más rápida y negativa.
*   **Referencia (G2):** Articulación interfalángica proximal (IFP) del dedo índice.
*   **Estimulación (Misma Distancia):**
    *   **Nervio Mediano:** En la muñeca (mitad lateral).
    *   **Nervio Cubital:** En la muñeca medial.
    *   **Distancia:** Debe ser **exactamente igual** para ambos nervios, típicamente de **8 a 10 cm**.

### 3. Valores de Referencia y Anormalidad
*   **Límite de Normalidad:** La diferencia de latencia distal (Mediano - Cubital) debe ser **< 0.5 ms**.
*   **Patología (STC):** Una diferencia **≥ 0.5 ms** (lumbrical más lento) es **definitivamente anormal** y confirma STC.
*   **Inversión (Canal de Guyon):** Si el interóseo palmar (cubital) está más lento que el lumbrical por > 0.4 ms, sugiere atrapamiento del nervio cubital en la muñeca.`,
          clinicalPearls: [
            'Si en un estudio de rutina no obtiene CMAP tenar ni SNAP del mediano, no concluya "STC severo" sin antes intentar el estudio lumbrical. Frecuentemente encontrará una respuesta preservada.',
            'A sensibilidades altas, puede ver un pequeño pico rápido justo antes de la respuesta motora del lumbrical. Es el nervio mixto palmar del mediano; ignórelo y marque el inicio del potencial motor.',
            'Evite estímulos excesivamente altos para prevenir la co-estimulación de ambos nervios simultáneamente en la muñeca.'
          ],
          keyPoints: [
            'Compara 2° Lumbrical (Mediano) vs. 1° Interóseo Palmar (Cubital).',
            'Mismo montaje de registro en la palma para ambos nervios.',
            'Altamente resistente a la compresión (Lumbrical Sparing).',
            'Diferencia de latencia ≥ 0.5 ms confirma STC.'
          ]
        }
      ]
    },
    {
      id: 'late-responses', title: 'Respuestas Tardías (Onda F y Reflejo H)',
      description: 'Evaluación de los segmentos proximales y raíces nerviosas',
      children: [
        { id: 'f-wave-principles', title: 'La Onda F: principios y técnica',
          content: `La Onda F es una respuesta tardía que resulta de la descarga antidrómica de las motoneuronas alfa. A diferencia de los reflejos, NO es un arco reflejo (no tiene sinapsis).

**Mecanismo:**
1. El estímulo viaja hacia la médula (antidrómico).
2. Un pequeño porcentaje de motoneuronas (1-5%) "rebota" o se dispara de nuevo.
3. El impulso viaja de regreso al músculo (ortodrómico).

**Técnica:**
• Se estimula el nervio motor con intensidad supramáxima.
• El cátodo debe estar orientado hacia PROXIMAL (hacia la médula).
• Se registran al menos 10-20 trazos para identificar la latencia mínima.

**Parámetros clave:**
• **Latencia mínima:** Tiempo de la respuesta más rápida.
• **Cronodispersión:** Diferencia entre latencia máxima y mínima.
• **Persistencia:** Porcentaje de estímulos que generan una onda F (Normal >80%).`,
          clinicalPearls: [
            'La Onda F es la herramienta más sensible para detectar polirradiculopatías tempranas (como el inicio del Guillain-Barré), donde los estudios distales pueden ser normales.'
          ]
        },
        { id: 'h-reflex-principles', title: 'El Reflejo H: el arco reflejo S1',
          content: `El Reflejo H es el equivalente electrofisiológico del reflejo aquiliano. Es un verdadero arco reflejo monosináptico.

**Circuito:**
1. Fibras sensitivas Ia (aferentes).
2. Sinapsis en el asta anterior de la médula.
3. Motoneurona alfa (eferente).

**Técnica (Nervio Tibial):**
• Registro en el músculo Sóleo.
• Estimulación en el hueco poplíteo.
• **IMPORTANTE:** Se usa un estímulo de larga duración (0.5 - 1.0 ms) y BAJA intensidad.
• A medida que aumenta la intensidad, el Reflejo H aparece, llega a un máximo y luego DESAPARECE (inhibición por colisión con el CMAP).

**Valor clínico:**
• Evaluación de la raíz S1 y el arco reflejo proximal.
• Latencia normal típica: <34 ms (ajustar por estatura).`,
          clinicalPearls: [
            'El Reflejo H es exquisitamente sensible a la compresión de la raíz S1. Una diferencia >1.5 ms con el lado contralateral es patológica.'
          ]
        },
        { id: 'f-vs-h', title: 'Diferencias clave: Onda F vs. Reflejo H',
          content: `| Característica | Onda F | Reflejo H |
|---|---|---|
| Tipo | Respuesta motora pura | Arco reflejo monosináptico |
| Fibras aferentes | Motoras (antidrómicas) | Sensitivas Ia |
| Sinapsis | No | Sí (médula espinal) |
| Intensidad estímulo | Supramáxima | Submáxima |
| Nervios | Cualquier nervio motor | Principalmente Tibial (Sóleo) |
| Sentido del estímulo | Antidrómico | Ortodrómico (aferente) |`
        }
      ]
    }
  ]
};
