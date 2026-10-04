// src/content/modules/module-08-topographic-anatomy.ts
import { Module } from '../../types/content';
import brachialPlexusDiagram from '../../assets/images/brachial-plexus-diagram.webp';
import lumbosacralPlexusDiagram from '../../assets/images/lumbosacral-plexus-diagram.webp';
import drgConcept from '../../assets/images/drg-preganglionic-concept.webp';
import martinGruberDiagram from '../../assets/images/martin-gruber-anastomosis.webp';
import dermatomeDiagram from '../../assets/images/dermatome-map-clinical.webp';
import entrapmentSitesDiagram from '../../assets/images/nerve-entrapment-sites.webp';

export const module08: Module = {
  id: 'topographic-anatomy',
  number: 8,
  title: 'Anatomía Topográfica y Neuroconducción por Nervio',
  titleEn: 'Topographic Anatomy and Nerve-by-Nerve Conduction',
  emoji: '🗺️',
  description: 'Plexos, raíces, mapas de inervación, dermatomas, miotomas, anastomosis y sitios de atrapamiento',
  descriptionEn: 'Plexuses, roots, innervation maps, dermatomes, myotomes, anastomoses and entrapment sites',
  color: 'from-amber-500 to-amber-800',
  icon: 'Map',
  topics: [
    // ═══════════════════════════════════════════════════════════════
    // 1. PLEXO BRAQUIAL
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'brachial-plexus',
      title: 'Plexo Braquial',
      description: 'Anatomía completa del plexo braquial desde raíces hasta ramas terminales',
      content: 'El plexo braquial es la red nerviosa más compleja del cuerpo y la más frecuentemente evaluada en electrodiagnóstico del miembro superior. Se forma por las raíces ventrales de C5 a T1, organizándose en una secuencia de Raíces → Troncos → Divisiones → Fascículos → Ramas terminales. Comprender esta arquitectura es INDISPENSABLE para localizar lesiones.',
      imageUrls: [
        { src: brachialPlexusDiagram, alt: 'Diagrama del Plexo Braquial', caption: 'Organización del plexo braquial: raíces (C5-T1) → troncos → divisiones → fascículos → ramas terminales' }
      ],
      clinicalPearls: [
        'MNEMOTECNIA: "Roberto Tiene Dos Frutas Buenas" → Raíces, Troncos, Divisiones, Fascículos, Branches (ramas).',
        'La localización EMG dentro del plexo requiere evaluar músculos de DIFERENTES nervios pero de la MISMA raíz o tronco. Si los músculos afectados comparten nervio, es neuropatía focal. Si comparten raíz/tronco pero diferentes nervios, es plexopatía.',
      ],
      keyPoints: [
        'Raíces C5-T1 → 3 troncos → 6 divisiones → 3 fascículos → 5 ramas terminales.',
        'Localización por patrón: ¿distribución por nervio (neuropatía) o por raíz/tronco (plexopatía)?',
        'Clave: los SNAPs son ANORMALES en plexopatía (postganglionar) pero NORMALES en radiculopatía (preganglionar).',
      ],
      children: [
        {
          id: 'roots-c5-t1',
          title: 'Raíces (C5-T1): Función Motora y Sensitiva',
          content: `Cada raíz cervical aporta fibras motoras y sensitivas específicas. El conocimiento de estas contribuciones es la base de la localización topográfica.

**C5:**
Motor: deltoides (abducción hombro), bíceps (flexión codo), supraespinoso, infraespinoso, romboides.
Sensitivo: lateral del brazo (nervio axilar, cutáneo braquial lateral).
Reflejo: bicipital.
Músculo indicador EMG: deltoides (nervio axilar) + bíceps (musculocutáneo).

**C6:**
Motor: bíceps, braquiorradial, supinador, extensores radiales del carpo (ECRL/ECRB).
Sensitivo: lateral del antebrazo y pulgar.
Reflejo: braquiorradial.
Músculo indicador EMG: braquiorradial (radial) + pronador teres (mediano).

**C7:**
Motor: tríceps, flexor radial del carpo, extensores de dedos, pronador teres, dorsal ancho.
Sensitivo: dedo medio (puede variar).
Reflejo: tricipital.
Músculo indicador EMG: tríceps (radial) + pronador teres (mediano) + extensor de dedos (PIN).

**C8:**
Motor: flexor profundo de dedos (mediano y ulnar), flexor largo del pulgar, extensor del índice, extensor carpi ulnaris.
Sensitivo: borde medial del antebrazo distal, dedo meñique.
Reflejo: ninguno confiable.
Músculo indicador EMG: extensor indicis proprius (PIN) + FDP (mediano — índice/medio).

**T1:**
Motor: intrínsecos de la mano — interóseos, lumbricales, abductor del meñique (ADM), abductor pollicis brevis (APB).
Sensitivo: borde medial del brazo.
Reflejo: ninguno.
Músculo indicador EMG: APB (mediano) + FDI (ulnar).`,
          clinicalPearls: [
            'PERLA DE LOCALIZACIÓN: Si el deltoides (C5, axilar) Y el bíceps (C5-C6, musculocutáneo) están débiles pero el braquiorradial (C5-C6, radial) está normal → lesión del tronco superior o fascículo lateral, NO radiculopatía C5.',
            'C7 es la raíz más frecuentemente afectada en hernia discal cervical. La tríada clásica: debilidad de tríceps + extensión de dedos + reflejo tricipital abolido.',
            'Los intrínsecos de la mano (T1) reciben inervación del nervio ulnar y mediano PERO todos comparten la raíz T1. Si TODOS los intrínsecos están débiles (APB mediano + FDI ulnar), la lesión es T1 o tronco inferior, no un solo nervio.',
          ],
        },
        {
          id: 'trunks',
          title: 'Troncos: Superior, Medio e Inferior',
          content: `**Tronco Superior (C5-C6):**
Formado por la unión de C5 y C6. Da origen al nervio supraescapular (supraespinoso/infraespinoso) ANTES de dividirse. Su lesión produce la parálisis de Erb-Duchenne.

**Parálisis de Erb-Duchenne (tronco superior):**
• Debilidad de abducción hombro (deltoides), rotación externa (infraespinoso), flexión codo (bíceps), supinación (supinador).
• "Postura del camarero" — brazo aducido, rotado internamente, codo extendido, antebrazo pronado.
• Causa clásica: tracción obstétrica del hombro, caídas, traumatismo.
• SNAP del musculocutáneo lateral (nervio cutáneo lateral del antebrazo) REDUCIDO — confirma lesión postganglionar.

**Tronco Medio (C7):**
Raíz C7 sola. Contribuye al radial y al mediano. Su lesión aislada es RARA.

**Tronco Inferior (C8-T1):**
Formado por C8 y T1. Su lesión produce la parálisis de Klumpke.

**Parálisis de Klumpke (tronco inferior):**
• Debilidad de intrínsecos de la mano (todos), flexores de dedos, flexor ulnar del carpo.
• Mano en garra.
• Causa: tracción por abducción extrema del brazo, tumor de Pancoast (ápex pulmonar), síndrome de salida torácica.
• Si hay Horner asociado (miosis, ptosis, anhidrosis) → afectación de la cadena simpática cervical (ganglio estrellado), indica lesión proximal severa.`,
          clinicalPearls: [
            'ATENCIÓN CLÍNICA: tronco inferior + Horner en adulto = descartar tumor de Pancoast (cáncer de ápex pulmonar) con radiografía/TAC de tórax URGENTE. Es una emergencia oncológica.',
            'El nervio supraescapular sale del tronco superior ANTES de las divisiones. Si está afectado (debilidad de rotación externa + abducción temprana), la lesión está en el tronco superior o más proximal, no en el fascículo.',
            'La parálisis de Erb neonatal tiene excelente pronóstico (~90% recuperación) si hay reinervación EMG a los 3 meses. Si NO hay reinervación a los 3-6 meses, considerar cirugía de nervios.',
          ],
          keyPoints: [
            'Tronco superior (C5-C6): Erb-Duchenne — "postura del camarero".',
            'Tronco inferior (C8-T1): Klumpke — mano en garra ± Horner.',
            'Horner + tronco inferior en adulto = descartar Pancoast urgente.',
          ],
        },
        {
          id: 'cords',
          title: 'Fascículos: Lateral, Posterior y Medial',
          content: `Los fascículos reciben su nombre por su posición relativa a la arteria axilar.

**Fascículo Lateral (divisiones anteriores del tronco superior y medio):**
• Da origen al nervio musculocutáneo (terminal).
• Contribuye con la raíz LATERAL del nervio mediano.
• Lesión: debilidad de flexión de codo (musculocutáneo) + componente mediano proximal (pronación, FCR), pero con preservación de intrínsecos de la mano (la raíz medial del mediano está intacta).

**Fascículo Posterior (divisiones posteriores de los 3 troncos):**
• Da origen al nervio axilar y al nervio radial.
• Lesión: debilidad de abducción hombro (axilar/deltoides) + TODA la musculatura radial (extensión codo, muñeca, dedos). El mediano y ulnar están preservados.
• Patrón EMG: deltoides + extensores + tríceps todos afectados = fascículo posterior (NO radiculopatía C7 aislada, que no afectaría deltoides).

**Fascículo Medial (división anterior del tronco inferior):**
• Da origen al nervio ulnar (terminal).
• Contribuye con la raíz MEDIAL del nervio mediano.
• Da origen a los nervios cutáneos braquial medial y antebraquial medial.
• Lesión: debilidad de ulnar + componente distal del mediano (intrínsecos). SNAP del cutáneo antebraquial medial REDUCIDO — hallazgo clave para localizar en fascículo medial vs nervio ulnar aislado.`,
          clinicalPearls: [
            'PERLA DIAGNÓSTICA: Si los intrínsecos medianos (APB, lumbricales I-II) Y los ulnares (FDI, ADM) están débiles PERO el bíceps (musculocutáneo) y extensores (radial) están normales → fascículo medial, NO T1 ni tronco inferior (en tronco inferior, los flexores de dedos C8 también estarían afectados).',
            'Para diferenciar fascículo lateral vs tronco superior: evaluar el nervio supraescapular. Si el supraespinoso/infraespinoso están débiles → lesión en tronco superior (más proximal). Si están normales → fascículo lateral.',
            'El SNAP del cutáneo antebraquial medial (MABCN) es la CLAVE para el fascículo medial. Si este SNAP está reducido + debilidad ulnar = fascículo medial. Si este SNAP es normal + debilidad ulnar = neuropatía ulnar aislada.',
          ],
        },
        {
          id: 'terminal-branches-detail',
          title: 'Ramas Terminales: Los 5 Nervios Principales',
          content: `Las cinco ramas terminales del plexo braquial son los nervios que más frecuentemente se evalúan en NCS/EMG del miembro superior.

**1. Nervio Musculocutáneo (C5-C7, fascículo lateral):**
• Motor: bíceps, braquial, coracobraquial.
• Sensitivo: cutáneo lateral del antebrazo (LACN).
• NCS: SNAP del cutáneo lateral del antebrazo. No hay estudio motor estándar (técnicamente difícil).

**2. Nervio Axilar (C5-C6, fascículo posterior):**
• Motor: deltoides, redondo menor.
• Sensitivo: parche regimental (lateral del hombro).
• Vulnerabilidad: luxación glenohumeral, fractura de cuello humeral.

**3. Nervio Radial (C5-T1, fascículo posterior):**
• Motor: tríceps, braquiorradial, extensores de muñeca y dedos, supinador, abductor largo del pulgar.
• Sensitivo: dorso de la mano (SRNR — nervio radial superficial).
• Sitios de atrapamiento: canal espiral del húmero (Saturday night palsy), arcada de Frohse (síndrome del nervio interóseo posterior/PIN).

**4. Nervio Mediano (C5-T1, fascículos lateral + medial):**
• Motor: pronadores, FCR, FDS, FPL, FDP (índice/medio), oponente/APB/lumbricales I-II.
• Sensitivo: palmar de dedos 1-3 y mitad de 4 (palmar digital).
• Sitio de atrapamiento principal: túnel carpiano (STC).

**5. Nervio Ulnar (C8-T1, fascículo medial):**
• Motor: FCU, FDP (anular/meñique), interóseos, lumbricales III-IV, ADM, aductor del pulgar.
• Sensitivo: borde medial de mano y dedo 5 + mitad de 4.
• Sitio de atrapamiento principal: túnel cubital (codo), canal de Guyon (muñeca).`,
          clinicalPearls: [
            'Para distinguir lesión de nervio mediano alto (codo) vs bajo (STC): evaluar pronador teres y FCR. Si están débiles → lesión alta. Si solo hay debilidad de APB/oponente → STC (solo rama motora recurrente).',
            'Saturday Night Palsy (parálisis radial por compresión en canal espiral): el tríceps usualmente se PRESERVA (su rama sale ANTES del canal espiral). Si el tríceps está débil, la lesión es más proximal (axilar o fascículo posterior).',
            'El nervio ulnar tiene DOBLE sitio de atrapamiento: codo (90% de los casos) y muñeca (canal de Guyon, 10%). La rama sensitiva dorsal del ulnar sale ANTES del canal de Guyon — si el SNAP dorsal está normal pero hay debilidad de intrínsecos, la lesión está en Guyon, no en codo.',
          ],
        },
        {
          id: 'erb-point-protocol',
          title: 'Punto de Erb y Estimulación Supraclavicular',
          content: `El punto de Erb es el sitio anatómico más importante para la estimulación proximal del plexo braquial.

**Localización:**
Ángulo posterior del triángulo posterior del cuello, aproximadamente 2-3 cm por encima de la clavícula, en el borde posterior del esternocleidomastoideo. Aquí el tronco superior (C5-C6) es superficial y accesible al estimulador.

**Aplicaciones electrodiagnósticas:**

**1. Estudio de velocidad de conducción proximal:**
Estimular en punto de Erb y registrar en bíceps (musculocutáneo) o deltoides (axilar). Calcular la latencia proximal y compararla con la distal. Un enlentecimiento selectivo proximal sugiere lesión de plexo o raíz.

**2. Diagnóstico de síndrome de salida torácica neurogénica (SSTO):**
El SSTO verdadero afecta las fibras C8-T1 del tronco inferior. Hallazgos NCS clásicos:
• CMAP ulnar NORMAL con estimulación en muñeca y codo.
• SNAP mediano reducido (fibras C6-C7 del mediano afectadas al pasar por la costilla cervical).
• SNAP ulnar NORMAL (sus fibras sensitivas entran más alto).
• EMG: denervación en APB (mediano-T1) > ADM (ulnar-T1).

**3. Técnica de Inching del plexo:**
Estimulación secuencial en punto de Erb, supraclavicular, infraclavicular y axila. Permite localizar bloqueos de conducción o saltos de latencia a lo largo del plexo.`,
          clinicalPearls: [
            'SSTO verdadero (neurogénico) es MUY RARO — la mayoría de "SSTO" referidos al laboratorio son SSTO disputado/inespecífico con NCS/EMG normales. El SSTO neurogénico verdadero tiene un patrón NCS ESPECÍFICO: SNAP mediano bajo + CMAP ulnar normal + atrofia tenar > hipotenar.',
            'La estimulación en punto de Erb es incómoda para el paciente (contracción de todo el brazo). Advertir previamente y usar estímulo supramáximo breve.',
          ],
        },
        {
          id: 'thoracic-outlet',
          title: 'Síndrome de Salida Torácica Neurogénica (SSTO)',
          content: `El SSTO verdadero es la compresión del tronco inferior (C8-T1) del plexo braquial por una costilla cervical, banda fibrosa congénita o apófisis transversa C7 elongada.

**Tríada electrodiagnóstica del SSTO verdadero (Gilliatt-Sumner hand):**

1. **SNAP mediano REDUCIDO** (fibras sensitivas C6-7 comprimidas al pasar sobre la banda/costilla).
2. **CMAP ulnar NORMAL** (las fibras motoras ulnares pasan por encima de la compresión).
3. **EMG con denervación selectiva:** APB (mediano, T1) más afectado que ADM (ulnar, T1). Atrofia tenar > hipotenar.

**Patrón paradójico:**
La compresión está en C8-T1, pero los nervios más afectados electrodiagnósticamente son el mediano (SNAP) y el APB (motor mediano). Esto se explica porque las fibras del mediano que vienen de C8-T1 pasan por la parte más baja del tronco inferior, directamente sobre la costilla cervical.

**Categorías de SSTO:**
• **Neurogénico verdadero:** Hallazgos NCS/EMG claros. Banda fibrosa/costilla cervical demostrable. RARO (1/millón).
• **Vascular:** Compresión arterial/venosa. Síntomas isquémicos, trombosis. Diagnóstico vascular, no EMG.
• **Disputado/Inespecífico:** Dolor y parestesias sin hallazgos NCS/EMG objetivos. MUY COMÚN. Diagnóstico clínico, NO electrodiagnóstico.`,
          clinicalPearls: [
            'Si las NCS y EMG son completamente NORMALES, NO diagnostiques SSTO neurogénico. El SSTO disputado existe pero NO es un diagnóstico electrodiagnóstico — es un diagnóstico clínico de exclusión.',
            'Patrón paradójico SSTO = mediano sensitivo bajo + ulnar motor normal. Si ves lo contrario (ulnar bajo, mediano normal) = neuropatía ulnar en codo, NO SSTO.',
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 2. PLEXO LUMBOSACRO
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'lumbosacral-plexus',
      title: 'Plexo Lumbosacro',
      description: 'Anatomía del plexo lumbar y sacro con nervios emergentes y patología',
      content: 'El plexo lumbosacro se divide funcionalmente en dos componentes: el plexo lumbar (L1-L4) y el plexo sacro (L4-S3), conectados por el tronco lumbosacro (L4-L5). A diferencia del plexo braquial, el plexo lumbosacro es profundo y difícil de estimular directamente, lo que hace que el EMG de aguja sea la herramienta diagnóstica principal para plexopatías lumbosacras.',
      imageUrls: [
        { src: lumbosacralPlexusDiagram, alt: 'Diagrama del Plexo Lumbosacro', caption: 'Organización del plexo lumbosacro: plexo lumbar (L1-L4) y plexo sacro (L4-S3) con nervios emergentes' }
      ],
      clinicalPearls: [
        'A diferencia del plexo braquial donde las NCS proximales son posibles (punto de Erb), en el plexo lumbosacro NO hay estimulación proximal accesible. El diagnóstico depende casi exclusivamente de EMG de aguja + NCS distales + patrón clínico.',
        'SNAP del safeno (femoral, L3-L4) y SNAP del sural (tibial, S1-S2) son los dos SNAPs clave para localización lumbosacra. Si están reducidos = lesión postganglionar (plexopatía). Si normales = preganglionar (radiculopatía).',
      ],
      children: [
        {
          id: 'lumbar-plexus-detail',
          title: 'Plexo Lumbar (L1-L4): Nervios y Territorios',
          content: `Formado dentro del músculo psoas mayor. Sus ramas principales inervan la pared abdominal inferior, la región inguinal y el compartimento anterior del muslo.

**Nervio Iliohipogástrico (L1):**
Motor: oblicuo interno, transverso abdominal. Sensitivo: región suprapúbica.

**Nervio Ilioinguinal (L1):**
Motor: contribuye a oblicuos. Sensitivo: raíz del pene/labio mayor, cara interna del muslo proximal.
Relevancia: atrapamiento post-quirúrgico (herniorrafia, cesárea).

**Nervio Genitofemoral (L1-L2):**
Rama genital: músculo cremáster (reflejo cremastérico). Rama femoral: sensitivo anteromedial del muslo.

**Nervio Femorocutáneo Lateral (L2-L3):**
Puramente sensitivo. Inerva la cara lateral del muslo.
Atrapamiento bajo el ligamento inguinal = Meralgia Parestésica.
Diagnóstico NCS: SNAP del cutáneo femoral lateral comparativo bilateral (reducido ipsilateral).

**Nervio Femoral (L2-L4):**
El nervio motor principal del plexo lumbar. Motor: iliopsoas (flexión cadera), cuádriceps (extensión rodilla), sartorio.
Sensitivo: anterior del muslo + nervio safeno (medial de pierna hasta maléolo medial).
Reflejo: patelar/rotuliano (L3-L4).
NCS: SNAP safeno + CMAP del femoral registrado en recto femoral o vasto medial.

**Nervio Obturador (L2-L4):**
Motor: aductor largo, aductor breve, aductor mayor (parcial), grácil.
Sensitivo: cara interna del muslo. NCS formal difícil — evaluación principalmente por EMG de aguja en aductores.`,
          clinicalPearls: [
            'Meralgia parestésica (atrapamiento del femorocutáneo lateral): dolor/adormecimiento de cara lateral del muslo sin debilidad motora. Factores de riesgo: obesidad, embarazo, cinturones apretados, diabetes. NO requiere EMG a menos que haya duda diagnóstica — el SNAP del LFCN comparativo bilateral es diagnóstico.',
            'Para diferenciar neuropatía femoral vs radiculopatía L3-L4: evaluar los aductores (obturador, L2-L4). Si los aductores están afectados JUNTO con el cuádriceps → plexopatía lumbar (ambos nervios del plexo). Si solo el cuádriceps está afectado → neuropatía femoral aislada.',
          ],
        },
        {
          id: 'sacral-plexus-detail',
          title: 'Plexo Sacro (L4-S3): Nervios y Territorios',
          content: `Se forma sobre la cara anterior del músculo piriforme. El tronco lumbosacro (L4-L5) conecta el plexo lumbar con el sacro.

**Nervio Glúteo Superior (L4-S1):**
Motor: glúteo medio, glúteo menor, tensor de la fascia lata.
Función: abducción de cadera. Signo de Trendelenburg si está lesionado.

**Nervio Glúteo Inferior (L5-S2):**
Motor: glúteo mayor.
Función: extensión de cadera (subir escaleras, levantarse de silla).

**Nervio Ciático (L4-S3):**
El nervio más largo y grueso del cuerpo. Se divide en dos componentes que FUNCIONAN como nervios separados desde su origen, aunque estén envueltos en la misma vaina epineural:

• **División Peronea (fibular):** Posterolateral. Origen L4-S2. Se convierte en peroneo común en la fosa poplítea.
  → Peroneo Profundo (NPI): tibial anterior (dorsiflexión), extensores de dedos/hallux, peroneo tercero.
  → Peroneo Superficial (NPS): peroneos largo y corto (eversión), sensitivo: dorso del pie (excepto primer espacio).

• **División Tibial:** Posteromedial. Origen L4-S3. Se convierte en nervio tibial.
  → Motor: gastrocnemio, sóleo (plantiflexión S1-S2), tibial posterior (inversión), flexor largo de dedos/hallux.
  → Sensitivo: nervio sural (lateral del tobillo/pie), plantar medial y lateral.

**Nervio Pudendo (S2-S4):**
Motor: esfínter anal externo, esfínter uretral. Sensitivo: periné.
Estudio: EMG de esfínter anal (fundamental en lesiones de cola de caballo).`,
          clinicalPearls: [
            'CLAVE ANATÓMICA: la división peronea del ciático es más vulnerable que la tibial porque está en posición posterolateral (más expuesta a compresión contra estructuras óseas). Por eso las lesiones del ciático a nivel de cadera/muslo afectan preferentemente la dorsiflexión (peroneo) → simulando una lesión del peroneo común aislado.',
            'Para diferenciar lesión del ciático (división peronea) vs peroneo común en cabeza de peroné: evaluar bíceps femoral cabeza corta (ciático-peroneo, muslo). Si está afectado → lesión alta (ciático/pelvis). Si está normal → lesión baja (cabeza de peroné).',
            'El reflejo aquíleo (S1-S2) es mediado por el nervio tibial. Su ausencia unilateral = radiculopatía S1 (causa más frecuente: hernia discal L5-S1).',
          ],
          keyPoints: [
            'Ciático = división peronea (L4-S2) + división tibial (L4-S3) en una sola vaina.',
            'División peronea: dorsiflexión + eversión. División tibial: plantiflexión + inversión.',
            'La división peronea es más vulnerable a compresión.',
            'Bíceps femoral cabeza corta = músculo clave para localizar lesión alta vs baja.',
          ],
        },
        {
          id: 'diabetic-radiculoplexopathy',
          title: 'Radiculoplexoneuropatía Lumbosacra Diabética (Bruns-Garland)',
          content: `También llamada amiotrofia diabética. Es una vasculitis autoinmune del plexo lumbosacro que afecta a pacientes diabéticos, típicamente varones >50 años con DM2 y buen control glucémico.

**Presentación clínica:**
• Inicio agudo/subagudo con dolor INTENSO (el peor dolor de su vida) en muslo anterior y cadera.
• Debilidad proximal severa de pierna (cuádriceps, iliopsoas, aductores).
• Pérdida ponderal significativa (hasta 10-15 kg).
• Típicamente unilateral, pero puede hacerse bilateral en semanas.

**Hallazgos electrodiagnósticos:**
• SNAPs: safeno reducido, femorocutáneo lateral reducido (lesión postganglionar = plexo/nervio, NO raíz sola).
• CMAPs: femoral reducido.
• EMG: denervación activa (fibrilaciones profusas) en cuádriceps, iliopsoas, aductores Y paraespinales lumbares. El patrón multifocal afectando nervios femoral Y obturador Y raíces lumbares confirma radiculoplexopatía (no neuropatía femoral aislada).

**Diferenciación de la neuropatía diabética distal:**
| | Neuropatía diabética distal | Amiotrofia diabética |
|---|---|---|
| Distribución | Longitud-dependiente, distal | Proximal, asimétrica |
| Dolor | Leve/moderado quemante | Severo, incapacitante |
| Debilidad | Mínima o tardía | Severa y temprana |
| Curso | Gradual, años | Agudo, semanas |
| Mecanismo | Metabólico | Autoinmune (vasculitis) |
| Tratamiento | Control glucémico | Inmunoterapia puede ayudar |`,
          clinicalPearls: [
            'La amiotrofia diabética NO es "la neuropatía diabética usual que progresó". Es una ENTIDAD DIFERENTE con mecanismo autoinmune (vasculitis de vasa nervorum). Reconocerla cambia el tratamiento: algunos pacientes responden a IVIg o corticoides.',
            'Pista diagnóstica: si un paciente diabético presenta dolor proximal AGUDO con debilidad y pérdida de peso → es amiotrofia diabética hasta probar lo contrario. La neuropatía diabética distal es gradual y no produce dolor proximal severo.',
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 3. GANGLIO DE LA RAÍZ DORSAL (GRD)
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'dorsal-root-ganglion',
      title: 'Ganglio de la Raíz Dorsal (GRD)',
      description: 'Anatomía funcional y la regla pre/postganglionar más importante en electrodiagnóstico',
      content: 'El ganglio de la raíz dorsal contiene los cuerpos celulares de las neuronas sensitivas primarias. Su ubicación en el foramen intervertebral, FUERA de la duramadre, crea la división anatómica más importante en electrodiagnóstico: la distinción entre lesiones preganglionares y postganglionares.',
      imageUrls: [
        { src: drgConcept, alt: 'Concepto pre/postganglionar del GRD', caption: 'Lesión preganglionar (radiculopatía): SNAP preservado. Lesión postganglionar (plexopatía/neuropatía): SNAP reducido' }
      ],
      clinicalPearls: [
        'Esta es LA REGLA MÁS IMPORTANTE en electrodiagnóstico: el SNAP define si la lesión es preganglionar (raíz) o postganglionar (plexo/nervio). Memorízalo como dogma.',
      ],
      children: [
        {
          id: 'grg-anatomy',
          title: 'Anatomía Funcional del GRD',
          content: `La neurona sensitiva primaria es una célula pseudounipolar con un axón que se divide en T:

• **Rama periférica:** Viaja distalmente hacia el receptor sensitivo en la piel/músculo. Esta rama ES el nervio sensitivo que exploramos en las NCS.
• **Rama central:** Entra a la médula espinal a través de la raíz dorsal y hace sinapsis en el asta dorsal.
• **Cuerpo celular:** Ubicado en el GRD, dentro del foramen intervertebral, FUERA del espacio subaracnoideo.

**Consecuencia fisiológica:**
Si la lesión está PROXIMAL al GRD (dentro del canal espinal, afectando la raíz o la médula), el cuerpo celular en el GRD sigue INTACTO y la rama periférica sigue VIVA. Por lo tanto, el SNAP (que mide la conducción de la rama periférica) está NORMAL a pesar de que el paciente tiene anestesia clínica.

Si la lesión está DISTAL al GRD (afectando el plexo, el nervio periférico o la propia rama), el axón periférico degenera (degeneración walleriana) y el SNAP DISMINUYE.`,
          clinicalPearls: [
            'Excepción a la regla: en ganglioneuropatía sensitiva (Sjögren, paraneoplásica), el propio GRD es atacado autoinmunemente. En este caso, tanto la rama periférica como la central degeneran → SNAPs AUSENTES con distribución NO longitud-dependiente (afecta manos y pies simultáneamente, a veces más en MS). Este patrón es casi patognomónico de ganglioneuropatía.',
          ],
        },
        {
          id: 'pre-post-ganglionic-rule',
          title: 'La Regla Pre vs. Postganglionar: Aplicación Clínica',
          content: `**Caso 1: Radiculopatía cervical C6**
• Clínica: dolor radicular, debilidad de bíceps, adormecimiento del pulgar.
• SNAP mediano al pulgar: NORMAL (lesión preganglionar).
• EMG: fibrilaciones en bíceps, pronador teres, braquiorradial, paraespinales cervicales.

**Caso 2: Plexopatía braquial (tronco superior)**
• Clínica: similar a radiculopatía C5-C6 (debilidad deltoides, bíceps).
• SNAP del cutáneo lateral del antebrazo: REDUCIDO (lesión postganglionar — la diferencia crucial).
• EMG: fibrilaciones en deltoides, bíceps, supraespinoso, pero paraespinales NORMALES.

**Caso 3: Avulsión de raíz cervical (trauma severo)**
• Lesión preganglionar extrema (arrancamiento de la raíz de la médula).
• SNAP: PARADÓJICAMENTE NORMAL a pesar de anestesia completa del dermatoma.
• EMG: denervación profunda en todos los miotomas de la raíz afectada.
• Significado pronóstico: DEVASTADOR — la raíz no puede regenerar porque está separada de la médula.

**TABLA RESUMEN:**
| | Radiculopatía | Plexopatía | Neuropatía focal |
|---|---|---|---|
| SNAP | Normal | Reducido | Reducido |
| Paraespinales | Afectados | Normales | Normales |
| Distribución EMG | Miotómica | Por tronco/fascículo | Por nervio |`,
          clinicalPearls: [
            'PERLA MEDICOLEGAL: En trauma con avulsión radicular cervical, el SNAP normal con anestesia clínica completa es la prueba de que la raíz fue arrancada de la médula. Este hallazgo tiene implicaciones medicolegales y pronósticas graves: NO hay posibilidad de regeneración espontánea — solo la transferencia nerviosa (ej., Oberlin transfer) puede restaurar función.',
            'Paraespinales C5-T1: si hay fibrilaciones → radiculopatía (la raíz innerva los paraespinales ANTES de formar el plexo). Si los paraespinales son NORMALES con denervación en músculos del brazo → plexopatía (el plexo se forma DESPUÉS de la ramificación a paraespinales).',
          ],
          keyPoints: [
            'SNAP normal + déficit sensitivo clínico = lesión PREGANGLIONAR (raíz/médula).',
            'SNAP reducido + déficit sensitivo = lesión POSTGANGLIONAR (plexo/nervio).',
            'Paraespinales afectados = radiculopatía. Paraespinales normales = plexo/nervio.',
            'Avulsión radicular: SNAP normal paradójico + denervación masiva = peor pronóstico.',
          ],
        },
        {
          id: 'ganglionopathies',
          title: 'Ganglioneuropatías Sensitivas',
          content: `Cuando el propio GRD es el target del ataque (autoinmune, infeccioso, paraneoplásico), se produce una neuronopatía sensitiva con un patrón electrodiagnóstico único.

**Causas principales:**
• Síndrome de Sjögren (la más frecuente).
• Paraneoplásica (anti-Hu, carcinoma de células pequeñas de pulmón).
• Cisplatino y otros quimioterapéuticos.
• Deficiencia de vitamina B6 (en megadosis).
• Ataxia de Friedreich.

**Patrón electrodiagnóstico característico:**
• SNAPs ausentes o severamente reducidos, NO longitud-dependiente (puede afectar más los SNAP de MS que MI).
• VCS normales o ligeramente lentas en los nervios restantes.
• CMAPs y VCM motora NORMALES (es puramente sensitiva).
• EMG de aguja: normal (no hay afectación motora).

**Patrón clínico:**
• Ataxia sensitiva severa (Romberg +, marcha atáxica por pérdida de propiocepción).
• Distribución NO longitud-dependiente — las manos pueden afectarse antes que los pies.
• Pseudoatetosis (movimientos involuntarios de dedos por pérdida propioceptiva con ojos cerrados).`,
          clinicalPearls: [
            'SNAP ausentes con distribución NO longitud-dependiente (manos = o > pies) + ataxia sensitiva sin debilidad = ganglioneuropatía hasta probar lo contrario. Solicitar anti-Hu, anti-SSA/SSB (Sjögren), TAC tórax (carcinoma pulmonar).',
            'La ganglioneuropatía por cisplatino es dosis-dependiente e irreversible. Aparece cuando la dosis acumulada supera 300-400 mg/m². El daño es al ADN del cuerpo celular del GRD.',
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 4. INERVACIONES ANÓMALAS
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'anomalous-innervation',
      title: 'Inervaciones Anómalas',
      description: 'Anastomosis nerviosas que confunden la interpretación electrodiagnóstica',
      content: 'Las variantes de inervación anómala afectan al 15-30% de la población y son la causa más frecuente de hallazgos NCS "inexplicables". No reconocerlas puede llevar a diagnósticos erróneos de bloqueo de conducción, neuropatía o incluso indicaciones quirúrgicas innecesarias.',
      imageUrls: [
        { src: martinGruberDiagram, alt: 'Anastomosis de Martin-Gruber', caption: 'Cruce de fibras motoras del mediano al ulnar en el antebrazo — presente en 15-30% de la población' }
      ],
      clinicalPearls: [
        'REGLA PRÁCTICA: si un hallazgo NCS no tiene sentido clínico (CMAP más grande proximal que distal, CMAP con deflexión positiva inicial), piensa en anastomosis ANTES de diagnosticar patología.',
      ],
      children: [
        {
          id: 'martin-gruber-detail',
          title: 'Anastomosis de Martin-Gruber (MGA)',
          content: `Es la anastomosis más frecuente (15-30%). Fibras motoras del nervio mediano cruzan al nervio ulnar en el antebrazo proximal.

**Tipos de MGA:**
• **Tipo I (más común):** Fibras del mediano → ulnar que inervan FDI (primer interóseo dorsal). El CMAP del ulnar registrando FDI es MAYOR con estimulación en codo que en muñeca (las fibras cruzadas se suman al CMAP proximal).
• **Tipo II:** Fibras cruzadas inervan hipotenar (ADM). CMAP ulnar hipotenar mayor proximal que distal.
• **Tipo III:** Fibras cruzadas inervan músculos tenares. CMAP mediano tenar puede tener cambios de morfología.

**Hallazgos NCS sospechosos de MGA:**
1. CMAP ulnar MAYOR con estimulación en codo que en muñeca → "falso bloqueo inverso".
2. CMAP del mediano en muñeca con deflexión POSITIVA inicial (las fibras que cruzan al ulnar crean un componente positivo por volumen).
3. Discrepancia de amplitud entre estimulación en muñeca y codo que no encaja con ninguna patología.

**Cómo CONFIRMAR MGA:**
• Estimular mediano en codo y registrar en FDI/ADM. Si aparece CMAP → hay fibras del mediano que cruzan a territorio ulnar.
• Calcular: CMAP ulnar (codo) = CMAP ulnar (muñeca) + componente cruzado del mediano.`,
          clinicalPearls: [
            'MGA + STC coexistentes: en un paciente con STC verdadero que también tiene MGA, el CMAP del mediano en muñeca parece DESPROPORCIONADAMENTE bajo (porque parte de las fibras medianas se registran en territorio ulnar, no en APB). Esto puede sobreestimar la severidad del STC.',
            'MGA + neuropatía ulnar en codo: la combinación puede hacer que el CMAP ulnar en codo parezca NORMAL (las fibras cruzadas del mediano compensan las fibras ulnares bloqueadas). El bloqueo real puede ocultarse.',
            'MGA es BILATERAL en >85% de los casos. Si la encuentras en un brazo, búscala en el otro.',
          ],
        },
        {
          id: 'riche-cannieu-detail',
          title: 'Anastomosis de Riche-Cannieu',
          content: `Comunicación motora en la palma entre la rama motora recurrente del mediano y la rama profunda del ulnar. Prevalencia estimada: 50-80% (mucho más común de lo que se piensa).

**Implicaciones clínicas:**
• En lesión completa del mediano en muñeca/STC severo, puede haber actividad residual en APB (abductor corto del pulgar) por inervación dual desde el ulnar a través de la anastomosis.
• En lesión completa del ulnar, pueden verse PUM residuales en intrínsecos usualmente "ulnares" recibiendo inervación cruzada del mediano.

**Caso extremo: "Mano toda-ulnar"**
Variante rara donde TODA la musculatura intrínseca de la mano (incluyendo APB y oponente) está inervada por el nervio ulnar. El CMAP del mediano registrando APB es muy bajo o ausente. La lesión ulnar causa parálisis completa de toda la mano.

**Caso extremo opuesto: "Mano toda-mediano"**
Toda la musculatura intrínseca inervada por el mediano. El CMAP ulnar registrando ADM es muy bajo. Lesión del mediano causa parálisis completa.`,
          clinicalPearls: [
            'Si un paciente con STC severo (ausencia de SNAP mediano) tiene APB con fuerza residual normal, NO asumas que "no es tan severo". Puede ser Riche-Cannieu manteniendo el APB vivo a través del ulnar. La cirugía sigue siendo necesaria para el componente sensitivo.',
          ],
        },
        {
          id: 'accessory-peroneal',
          title: 'Nervio Peroneo Accesorio',
          content: `Rama anómala del nervio peroneo superficial que inerva el músculo extensor digitorum brevis (EDB) por su cara LATERAL en vez de por el nervio peroneo profundo por la cara ANTERIOR.

**Prevalencia:** 15-28% de la población.

**Hallazgo NCS característico:**
CMAP del peroneo registrando EDB es MAYOR con estimulación en la cabeza de peroné/rodilla que en el tobillo. Normalmente debería ser igual o ligeramente menor. El exceso se debe a que las fibras accesorias (que pasan por detrás del maléolo lateral) solo se activan con estimulación proximal, no con la estimulación distal estándar en el tobillo anterior.

**Cómo confirmar:**
Estimular DETRÁS del maléolo lateral y registrar en EDB. Si aparece un CMAP → peroneo accesorio presente.

**Importancia práctica:**
Sin reconocerlo, parece un bloqueo de conducción del peroneo (CMAP proximal > distal). En un paciente evaluado por pie caído, podría diagnosticarse erróneamente neuropatía peronea cuando en realidad la asimetría de CMAP es solo por la anomalía anatómica.`,
          clinicalPearls: [
            'Truco diagnóstico rápido: si el CMAP del peroneo registrando EDB es inexplicablemente mayor con estimulación proximal que distal Y no hay otros hallazgos de neuropatía → estimula detrás del maléolo lateral. Si obtienes un CMAP = peroneo accesorio, misterio resuelto.',
            'El peroneo accesorio puede coexistir con neuropatía peronea verdadera. En ese caso, el CMAP "preservado" detrás del maléolo lateral puede enmascarar la severidad real de la neuropatía en la cabeza de peroné.',
          ],
        },
        {
          id: 'anomaly-diagnostic-impact',
          title: 'Protocolo para Detectar Anastomosis',
          content: `**Sospecha de MGA cuando:**
• CMAP ulnar codo > muñeca (sin explicación patológica).
• CMAP mediano con deflexión positiva inicial en muñeca.
• Discrepancia inexplicable entre estimulación proximal y distal.

**Sospecha de Riche-Cannieu cuando:**
• APB con actividad residual en lesión mediana "completa".
• CMAP mediano registrando APB muy bajo pero fuerza del pulgar preservada.

**Sospecha de peroneo accesorio cuando:**
• CMAP peroneo en EDB mayor proximal que distal.
• No hay otros hallazgos de neuropatía peronea.

**Protocolo de verificación universal:**
1. Identificar la discrepancia.
2. Estimular el nervio "dador" y registrar en el músculo "receptor".
3. Si hay CMAP cruzado → anastomosis confirmada.
4. Recalcular los parámetros NCS excluyendo el componente cruzado.`,
          keyPoints: [
            'MGA: 15-30%, fibras motoras mediano→ulnar en antebrazo.',
            'Riche-Cannieu: 50-80%, comunicación palmar mediano↔ulnar.',
            'Peroneo accesorio: 15-28%, rama lateral al EDB.',
            'Sospecha = discrepancia proximal/distal inexplicable. Confirma = estimulación cruzada.',
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 5. ATLAS DE NERVIOS POR REGIÓN
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'nerve-atlas',
      title: 'Atlas de Nervios por Región Anatómica',
      description: 'Mapas de inervación motora y sensitiva, dermatomas y miotomas clínicos',
      children: [
        {
          id: 'upper-innervation-map',
          title: 'Mapa de Inervación del Miembro Superior',
          content: `**NERVIO RADIAL (C5-T1, fascículo posterior):**

*Músculos motores (proximal → distal):*
• Tríceps (extensión codo) — C6-C8
• Braquiorradial (flexión codo en semiflexión) — C5-C6
• ECRL/ECRB (extensión radial muñeca) — C6-C7
• Supinador (supinación antebrazo) — C6
• ED (extensión dedos MP) — C7-C8
• ECU (extensión ulnar muñeca) — C7-C8
• EIP (extensión índice) — C7-C8
• APL/EPB/EPL (pulgar extensión/abducción) — C7-C8

*NCS motora:* Registrar en EIP (extensor indicis proprius), estimular en antebrazo y codo.
*SNAP:* Nervio radial superficial en tabaquera anatómica.

**NERVIO MEDIANO (C5-T1, fascículos lateral + medial):**

*Músculos motores:*
• Pronador teres (pronación) — C6-C7
• FCR (flexión radial muñeca) — C6-C7
• FDS (flexión IF proximal todos los dedos) — C7-T1
• FPL (flexión IF pulgar) — C8-T1 (nervio interóseo anterior/NIA)
• FDP I-II (flexión IF distal índice/medio) — C8-T1 (NIA)
• Pronador cuadrado — C8-T1 (NIA)
• APB (abducción pulgar) — C8-T1 (rama motora recurrente)
• Oponente del pulgar — C8-T1
• Lumbricales I-II — C8-T1

*NCS motora:* Registrar en APB, estimular en muñeca y codo.
*SNAP:* Mediano al 2do dedo (o comparativo mediano-ulnar al 4to dedo para STC).

**NERVIO ULNAR (C8-T1, fascículo medial):**

*Músculos motores:*
• FCU (flexión ulnar muñeca) — C8-T1
• FDP III-IV (flexión IF distal anular/meñique) — C8-T1
• ADM (abducción meñique) — C8-T1
• Oponente del meñique — C8-T1
• FDM (flexión IF meñique) — C8-T1
• Interóseos palmares/dorsales (abducción/aducción dedos) — C8-T1
• Lumbricales III-IV — C8-T1
• Aductor del pulgar (aducción pulgar) — C8-T1
• FPB cabeza profunda — C8-T1

*NCS motora:* Registrar en ADM (hipotenar) o FDI. Estimular en muñeca, bajo codo, sobre codo, axila.
*SNAP:* Ulnar al 5to dedo. Dorsal cutáneo ulnar (rama dorsal — sale ANTES del canal de Guyon).`,
          clinicalPearls: [
            'Diferenciador de lesión alta vs baja del mediano: Si FPL y FDP del índice están débiles → lesión del nervio interóseo anterior (NIA) o mediano alto. Si solo APB está débil → STC (solo rama motora recurrente).',
            'Para el nervio ulnar: si FCU y FDP IV-V están débiles → lesión en codo o más proximal. Si solo intrínsecos de la mano → canal de Guyon. El SNAP dorsal cutáneo ulnar ayuda: sale ANTES del canal de Guyon, por lo que está afectado en lesión de codo pero NORMAL en Guyon.',
          ],
        },
        {
          id: 'lower-innervation-map',
          title: 'Mapa de Inervación del Miembro Inferior',
          content: `**NERVIO FEMORAL (L2-L4):**
• Motor: iliopsoas (flexión cadera — aunque su inervación directa es L1-L3), sartorio, cuádriceps (recto femoral, vastos).
• Sensitivo: anterior del muslo + nervio safeno (medial pierna/tobillo).
• NCS: SNAP safeno (L3-L4). CMAP femoral registrando recto femoral.
• Reflejo: patelar.

**NERVIO OBTURADOR (L2-L4):**
• Motor: aductor largo, aductor breve, aductor mayor (parcial), grácil.
• Sensitivo: cara interna muslo.
• NCS formal: no estándar (profundo). Diagnóstico por EMG de aductores.

**NERVIO PERONEO COMÚN (L4-S2):**
• Se divide en profundo y superficial en la cabeza de peroné.

→ *Peroneo Profundo (NPI):*
• Motor: tibial anterior (dorsiflexión tobillo), EHL (extensión hallux), EDB (extensión dedos).
• Sensitivo: primer espacio interdigital del pie.
• NCS motora: registrar en EDB, estimular en tobillo y cabeza de peroné.

→ *Peroneo Superficial (NPS):*
• Motor: peroneos largo y corto (eversión pie).
• Sensitivo: dorso del pie (excepto primer espacio).
• NCS: SNAP del peroneo superficial en dorso del tobillo lateral.

**NERVIO TIBIAL (L4-S3):**
• Motor: gastrocnemio, sóleo (plantiflexión S1), tibial posterior (inversión), FDL, FHL.
• Se divide en plantar medial y lateral en el tobillo (túnel tarsiano).
• Sensitivo: nervio sural (lateral del tobillo/pie), plantares (planta del pie).
• NCS motora: registrar en AH (abductor hallucis), estimular en tobillo y poplítea.
• SNAP: sural (lateral del tobillo — el SNAP más importante del MI).`,
          clinicalPearls: [
            'El SNAP sural es el SNAP más confiable y reproducible del MI. Es el "mediano del MI" — fundamental en toda evaluación de polineuropatía. Si está reducido bilateralmente = polineuropatía axonal sensitiva.',
            'Diferencial de pie caído rápido: tibial anterior débil + eversores débiles (peroneos) = peroneo COMÚN. Si solo tibial anterior + EHL sin eversores = peroneo PROFUNDO aislado (raro). Si tibial anterior + gastrocnemio + tibial posterior todos débiles = ciático o L5+S1.',
          ],
        },
        {
          id: 'dermatome-map',
          title: 'Mapa de Dermatomas Clínicos Críticos',
          content: `Los dermatomas son la distribución sensitiva cutánea de una raíz espinal individual. Tienen amplia superposición entre raíces adyacentes, por lo que la pérdida de una sola raíz produce hipoestesia (reducción) más que anestesia (pérdida completa).

**Dermatomas del Miembro Superior (más relevantes en EMG):**
• **C5:** Cara lateral del brazo (región deltoidea — "parche regimental" del axilar).
• **C6:** Cara lateral del antebrazo, pulgar e índice. SNAP: LACN (cutáneo lateral antebrazo).
• **C7:** Dedo medio (variable — puede compartir con C6/C8).
• **C8:** Cara medial del antebrazo, dedo meñique y anular. SNAP: medial cutáneo antebrazo (MABCN).
• **T1:** Cara medial del brazo (proximal al codo).

**Dermatomas del Miembro Inferior:**
• **L2:** Cara anterior del muslo proximal.
• **L3:** Cara anterior del muslo medio y rodilla medial.
• **L4:** Cara medial de la pierna (tibia medial). SNAP: safeno.
• **L5:** Cara lateral de la pierna, dorso del pie, primer espacio interdigital. SNAP: peroneo superficial.
• **S1:** Cara lateral del pie, talón, planta. SNAP: sural.

**Referencia rápida de reflejos:**
• Bicipital: C5-C6
• Braquiorradial: C5-C6
• Tricipital: C7
• Patelar: L3-L4
• Aquíleo: S1-S2`,
          imageUrls: [
            { src: dermatomeDiagram, alt: 'Mapa de Dermatomas Clínicos', caption: 'Dermatomas clave para evaluación electrodiagnóstica: C5-T1 en MS y L2-S1 en MI' }
          ],
          clinicalPearls: [
            'PERLA: el reflejo aquíleo AUSENTE unilateralmente es el signo más sensible y específico de radiculopatía S1. Si un paciente tiene ciatalgia + reflejo aquíleo ausente ipsilateral → hernia L5-S1 con compresión S1 con alta probabilidad.',
            'Los dermatomas tienen AMPLIA superposición. Un paciente con compresión de C6 puede tener adormecimiento SOLO en el pulgar o hasta el pulgar + índice + antebrazo lateral. No descartes la raíz solo porque la distribución sensitiva no es "perfecta".',
          ],
        },
        {
          id: 'myotome-map',
          title: 'Mapa de Miotomas: Músculos Indicadores por Raíz',
          content: `Un miotoma es el grupo de músculos inervados por una raíz espinal, independientemente del nervio periférico que los lleve. Para CONFIRMAR que una lesión es radicular (y no de nervio), hay que demostrar afectación en músculos de DIFERENTES nervios pero de la MISMA raíz.

**Músculos indicadores por raíz (los más útiles en EMG):**

| Raíz | Músculos EMG indicadores | Nervios correspondientes |
|---|---|---|
| C5 | Deltoides, Infraespinoso, Bíceps | Axilar, Supraescapular, Musculocutáneo |
| C6 | Bíceps, Braquiorradial, Pronador teres | Musculocutáneo, Radial, Mediano |
| C7 | Tríceps, Pronador teres, FCR, ED | Radial, Mediano, PIN |
| C8 | EIP, FPL, FDP (índice), FDI | PIN, NIA, Mediano, Ulnar |
| T1 | APB, FDI, ADM | Mediano, Ulnar |
| L2-L3 | Iliopsoas, Aductores | Femoral, Obturador |
| L4 | Vasto medial, Tibial anterior | Femoral, Peroneo profundo |
| L5 | Tibial anterior, EHL, Glúteo medio, Tibial posterior | Peroneo prof., Peroneo prof., Glúteo sup., Tibial |
| S1 | Gastrocnemio medial, Bíceps femoral, Glúteo mayor | Tibial, Ciático, Glúteo inferior |

**Protocolo EMG mínimo para radiculopatía:**
Explorar al menos 2 músculos de la raíz sospechada inervados por NERVIOS DIFERENTES + paraespinales del nivel correspondiente.`,
          clinicalPearls: [
            'PERLA L5 vs peroneo: el tibial posterior (nervio tibial, L5) es el músculo CLAVE. Si está débil → lesión de L5 (no peroneo). Si está normal con debilidad de tibial anterior + peroneos → lesión del peroneo común.',
            'Para confirmar radiculopatía: necesitas denervación en ≥2 músculos de la misma raíz pero DIFERENTES nervios + paraespinales positivos. Un solo músculo anormal NO confirma radiculopatía — podría ser neuropatía focal.',
            'El glúteo medio (L5, glúteo superior) y el tibial posterior (L5, tibial) son el par perfecto para confirmar L5: diferentes nervios (glúteo superior vs tibial), misma raíz (L5).',
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 6. SITIOS DE ATRAPAMIENTO NERVIOSO
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'nerve-entrapment-sites',
      title: 'Sitios de Atrapamiento Nervioso',
      description: 'Atrapamientos más frecuentes con criterios NCS diagnósticos y protocolos',
      content: 'Los síndromes de atrapamiento nervioso son la indicación más frecuente para estudios electrodiagnósticos. Cada sitio de atrapamiento tiene criterios NCS específicos que definen la severidad y guían el manejo.',
      imageUrls: [
        { src: entrapmentSitesDiagram, alt: 'Sitios de Atrapamiento Nervioso', caption: 'Sitios de compresión más frecuentes en miembro superior e inferior' }
      ],
      children: [
        {
          id: 'carpal-tunnel',
          title: 'Síndrome del Túnel Carpiano (STC)',
          content: `Atrapamiento del nervio mediano bajo el retináculo flexor de la muñeca. El más frecuente de TODOS los atrapamientos.

**Criterios NCS diagnósticos (de sensibilidad creciente):**

**1. Latencia sensitiva mediano-ulnar comparativa al 4to dedo (test más sensible):**
Estimular mediano y ulnar en muñeca, registrar en 4to dedo (inervación dual). Diferencia >0.4 ms = anormal. Sensibilidad >95%.

**2. Latencia sensitiva mediano palma-muñeca:**
Estimulación en palma (8 cm), registro en muñeca. Latencia >2.2 ms = anormal.

**3. LMD mediano motor (APB):**
Registro en APB, estimulación en muñeca (8 cm). LMD >4.2 ms = anormal.

**4. VCS mediano al 2do dedo:**
<50 m/s = anormal (pero menos sensible que los comparativos).

**Clasificación de severidad:**
• **Leve:** Solo sensitiva anormal (SNAP lento, LMD normal, EMG del APB normal).
• **Moderado:** Sensitiva + motora anormal (LMD prolongada), EMG del APB con reclutamiento reducido pero sin denervación activa.
• **Severo:** SNAP ausente + LMD muy prolongada o ausente + EMG con fibrilaciones/PSW en APB + atrofia tenar clínica.`,
          clinicalPearls: [
            'El test comparativo mediano-ulnar al 4to dedo es el gold standard porque ambos nervios recorren la misma distancia hasta el mismo dedo, eliminando variables de distancia y temperatura. Si la diferencia es >0.4 ms, es STC independientemente de los valores absolutos.',
            'STC severo con SNAP ausente: si necesitas confirmar que el nervio aún conduce, haz la técnica de palma (segmento corto). A veces el SNAP reaparece con estimulación distal al retináculo.',
            'TRAMPA: no diagnostiques STC solo por LMD prolongada si la temperatura de la mano es <32°C. Calienta y repite.',
          ],
        },
        {
          id: 'cubital-tunnel',
          title: 'Neuropatía Ulnar en el Codo (Túnel Cubital)',
          content: `Segundo atrapamiento más frecuente. El nervio ulnar es comprimido en el túnel cubital (entre el epicóndilo medial y el olécranon) o bajo la aponeurosis del FCU.

**Criterios NCS diagnósticos:**

**1. VCM ulnar a través del codo:**
Estimular en muñeca, bajo codo (4 cm distal al epicóndilo), sobre codo (6-8 cm proximal al epicóndilo). VCM a través del codo <50 m/s = anormal. Diferencia VCM antebrazo vs codo >10 m/s = focal.

**2. Caída de amplitud del CMAP a través del codo:**
>20% reducción en amplitud/área = bloqueo de conducción parcial en codo.

**3. SNAP ulnar al 5to dedo:**
Reducido comparado con contralateral o con valores de referencia.

**4. SNAP dorsal cutáneo ulnar:**
Reducido si la lesión es en codo (sale ANTES del canal de Guyon). Normal en lesión de Guyon.

**Técnica de Inching:**
Estimular en incrementos de 2 cm a lo largo del ulnar a través del codo (desde 6 cm distal hasta 6 cm proximal al epicóndilo). Un salto de latencia >0.7 ms en un segmento de 2 cm localiza la compresión exacta.

**IMPORTANTE:** Medir con el codo en 70-90° de flexión (posición estándar). En extensión, el nervio se relaja y puede dar falsos resultados normales.`,
          clinicalPearls: [
            'El codo debe estar flexionado a 70-90° durante TODA la medición. En extensión, el nervio se relaja y la VCM puede normalizarse artificialmente. Error técnico frecuente.',
            'Mide la distancia sobre el codo con precisión: una diferencia de 1 cm en la medición puede cambiar la VCM hasta 5 m/s. Usa siempre la misma referencia anatómica (epicóndilo medial).',
            'Si el SNAP dorsal cutáneo ulnar está normal + debilidad de intrínsecos ulnares → la lesión está en el canal de Guyon (muñeca), NO en el codo.',
          ],
        },
        {
          id: 'radial-nerve-entrapment',
          title: 'Neuropatía Radial: Canal Espiral y PIN',
          content: `**Compresión en canal espiral del húmero (Saturday Night Palsy):**
• Causa: compresión prolongada del brazo contra superficie dura (intoxicación alcohólica, anestesia, silla de ruedas).
• Clínica: muñeca caída (wrist drop) + extensión de dedos débil. El tríceps usualmente está preservado (su rama sale ANTES del canal espiral).
• NCS: CMAP radial (EIP) reducido con estimulación proximal (axilar) vs distal (antebrazo) = bloqueo de conducción. SNAP radial superficial puede estar normal (si predomina neuropraxia) o reducido (si hay componente axonal).

**Síndrome del nervio interóseo posterior (PIN):**
• Compresión en la arcada de Frohse (borde proximal del supinador).
• Clínica: debilidad de extensión de dedos (sin muñeca caída porque ECRL está preservado — su rama sale ANTES de la arcada). FINGER DROP sin WRIST DROP.
• Sensitivo: completamente NORMAL (el PIN es puramente motor — la rama sensitiva radial superficial sale antes).
• NCS motora: CMAP reducido registrando en ED o EIP.

**Diferencial rápido neuropatía radial:**
| Nivel | Tríceps | Muñeca | Dedos | Sensitivo |
|---|---|---|---|---|
| Axilar/fascículo posterior | Débil | Caída | Débil | ↓ SNAP |
| Canal espiral | Normal | Caída | Débil | ↓ SNAP |
| PIN (arcada de Frohse) | Normal | Normal | Débil | Normal |`,
          clinicalPearls: [
            'Saturday Night Palsy: la gran mayoría son neuropraxia con excelente pronóstico (recuperación en 6-12 semanas). Si a las 3-4 semanas no hay signos de reinervación en EMG (PUM nacientes), considerar axonotmesis y pronóstico más prolongado.',
            'PIN vs C7: en PIN los extensores de muñeca radiales (ECRL) están preservados y el sensitivo es normal. En radiculopatía C7, los extensores de muñeca Y el FCR/pronador teres están afectados + reflejo tricipital puede estar abolido.',
          ],
        },
        {
          id: 'peroneal-entrapment',
          title: 'Neuropatía Peronea en Cabeza de Peroné',
          content: `Atrapamiento más frecuente del miembro inferior. El nervio peroneo común es vulnerable donde pasa superficialmente sobre la cabeza del peroné.

**Causas:** Cruce habitual de piernas, inmovilización prolongada, pérdida de peso rápida (desaparición de grasa protectora), compresión por férula/yeso, posición en cirugía.

**Clínica:** Pie caído agudo + debilidad de eversión (peroneos) + adormecimiento dorso del pie.

**Criterios NCS:**
• CMAP peroneo (EDB): reducido. Estimular en tobillo y cabeza de peroné — si hay caída >50% a través de la cabeza de peroné = bloqueo de conducción focal.
• VCM peroneo a través de la cabeza de peroné: <40 m/s = enlentecimiento focal.
• SNAP peroneo superficial: reducido (confirma componente axonal sensitivo).
• SNAP sural: NORMAL (nervio tibial, no afectado — diferencia clave vs polineuropatía).

**Diferencial crítico: peroneo en cabeza de peroné vs L5:**
| | Peroneo en cabeza de peroné | Radiculopatía L5 |
|---|---|---|
| Tibial anterior | Débil | Débil |
| Peroneos (eversión) | Débil | Puede estar débil |
| Tibial posterior (inversión) | NORMAL | DÉBIL (clave!) |
| Glúteo medio | NORMAL | Puede estar débil |
| SNAP peroneo superficial | Reducido | NORMAL (preganglionar) |
| Paraespinales lumbares | Normales | Pueden tener fibrilaciones |`,
          clinicalPearls: [
            'EL MÚSCULO CLAVE: tibial posterior. Si el tibial posterior (inversión del pie, nervio tibial, L5) está débil = NO es neuropatía peronea, es radiculopatía L5 o lesión del ciático (división peronea más afectada). Si el tibial posterior está normal = probablemente neuropatía peronea en cabeza de peroné.',
            'Si SNAP peroneo superficial está reducido = lesión postganglionar (nervio peroneo). Si SNAP peroneo superficial está normal con debilidad de dorsiflexión = lesión preganglionar (L5) — aplica la regla del GRD.',
            'Pronóstico: si el bloqueo es predominantemente de conducción (neuropraxia con CMAP distal preservado), la recuperación es excelente en 6-12 semanas. Si hay axonotmesis (CMAP distal muy bajo + fibrilaciones), la recuperación tarda 3-12 meses.',
          ],
        },
        {
          id: 'tarsal-tunnel',
          title: 'Síndrome del Túnel Tarsiano',
          content: `Atrapamiento del nervio tibial posterior bajo el retináculo flexor del tobillo (detrás y debajo del maléolo medial). Relativamente raro comparado con STC.

**Ramas afectadas:**
• Plantar medial: sensitivo de planta medial + motor de abductor hallucis (AH), FDB, lumbrical I.
• Plantar lateral: sensitivo de planta lateral + motor de intrínsecos plantares (abductor digiti quinti pedis — ADQP).
• Nervio calcáneo: sensitivo del talón medial.

**Criterios NCS:**
• LMD tibial motor prolongada registrando AH (plantar medial) o ADQP (plantar lateral).
• SNAP plantar medial ausente o reducido comparado con contralateral.
• VCM tibial proximal NORMAL (no hay enlentecimiento arriba del túnel).

**Diagnóstico desafiante:**
El síndrome del túnel tarsiano es difícil de diagnosticar electrodiagnósticamente por:
1. Los valores normales de NCS plantar tienen amplia variabilidad.
2. Los SNAP plantares son técnicamente difíciles de obtener (piel gruesa).
3. La polineuropatía diabética afecta las mismas estructuras, confundiendo los hallazgos.`,
          clinicalPearls: [
            'SNAP plantar medial COMPARATIVO bilateral es la técnica más útil. Una diferencia de amplitud >50% entre los dos pies sugiere patología unilateral. Los valores absolutos son menos confiables por la variabilidad normal.',
            'Diagnóstico diferencial: fascitis plantar (la causa MÁS frecuente de dolor plantar del pie) NO tiene hallazgos NCS — es puramente musculoesquelética. Si las NCS plantares son normales en un paciente con dolor plantar, piensa fascitis antes que túnel tarsiano.',
          ],
        },
      ],
    },
    // ═══════════════════════════════════════════════════════════════
    // 7. ATLAS PRÁCTICO DE NEUROCONDUCCIÓN: GUÍA PASO A PASO
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'ncs-practical-atlas',
      title: 'Atlas Práctico de Neuroconducción: Guía Paso a Paso',
      description: 'Protocolos detallados de colocación, estimulación y valores esperados por nervio',
      content: `Este atlas interactivo proporciona la referencia definitiva para la ejecución técnica de los estudios de neuroconducción. Cada protocolo ha sido refinado para maximizar el SNR y la reproducibilidad diagnóstica.

**Principios Universales de Calidad:**
1. **Temperatura:** Manos ≥32°C, Pies ≥30°C.
2. **Impedancia:** Limpiar con alcohol; gel conductor fresco.
3. **Estímulo:** SIEMPRE supramáximo (120-130% de la intensidad máxima).
4. **Morfología:** G1 sobre el centro de la masa muscular (punto motor) para evitar deflexiones iniciales positivas.`,
      children: [
        {
          id: 'median-motor-step',
          title: 'Nervio Mediano Motor (PAMC)',
          content: `Protocolo estándar para evaluar el segmento distal (STC) y antebrazo.

**Colocación de Electrodos:**
• **G1 (Activo):** Sobre el punto motor del **Abductor Pollicis Brevis (APB)** — centro de la eminencia tenar.
• **G2 (Referencia):** Sobre la articulación MCF del pulgar (tendón distal).
• **Tierra:** Dorso de la mano o entre muñeca y registro.

**Puntos de Estimulación:**
1. **Muñeca:** 8 cm proximal al G1, entre los tendones del Palmaris Longus y FCR.
2. **Codo:** Fosa antecubital, medial al tendón del bíceps (pulso braquial).
3. **Punto de Erb:** Supraclavicular (opcional para bloqueos proximales).

**Configuración de Estímulo:**
• Duración: 0.1 - 0.2 ms.
• Intensidad típica: 20 - 50 mA (supramáxima).

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| Latencia Motora Distal (LMD) | 3.4 - 4.0 ms | >4.4 ms |
| Amplitud (Base-Pico) | 5 - 15 mV | <4.0 mV |
| Velocidad Conducción (VCM) | 52 - 65 m/s | <50 m/s |`,
          clinicalPearls: [
            'Si obtienes un CMAP con muesca o deflexión inicial positiva, mueve el G1 ligeramente hacia el lateral o distal — el punto motor del APB puede variar.',
            'En STC severo, si no hay respuesta en muñeca, intenta estimular en la PALMA (estimulación trans-ligamentaria) para confirmar viabilidad axonal.',
          ],
        },
        {
          id: 'ulnar-motor-step',
          title: 'Nervio Ulnar Motor (PAMC)',
          content: `Protocolo crítico para la localización de neuropatía en el codo.

**Colocación de Electrodos:**
• **G1 (Activo):** Sobre el **Abductor Digiti Minimi (ADM)** — borde ulnar de la mano.
• **G2 (Referencia):** Base del 5to dedo (articulación MCF).
• **Tierra:** Dorso de la mano.

**Puntos de Estimulación (Técnica de 4 puntos):**
1. **Muñeca:** 8 cm proximal al G1 en el borde medial (lateral al tendón FCU).
2. **Bajo Codo (B-E):** 4 cm DIStal al epicóndilo medial.
3. **Sobre Codo (A-E):** 6 cm PROXimal al epicóndilo medial (total 10 cm entre B-E y A-E).
4. **Axila/Erb:** Para bloqueos proximales.

**Configuración de Estímulo:**
• **IMPORTANTE:** Codo flexionado a **70-90 grados** para todas las mediciones.

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| Latencia Motora Distal (LMD) | 2.5 - 3.2 ms | >3.4 ms |
| Amplitud (Base-Pico) | 6 - 16 mV | <5.0 mV |
| VCM Antebrazo | 58 - 65 m/s | <50 m/s |
| VCM a través del Codo | >50 m/s | <50 m/s (o caída >10 m/s vs antebrazo) |`,
          clinicalPearls: [
            'La distancia a través del codo (B-E a A-E) debe ser de 10 cm EXACTOS. Menos distancia aumenta el error de cálculo de velocidad dramáticamente.',
            'Si hay caída de amplitud >20% entre B-E y A-E con codo flexionado, sospecha bloqueo de conducción.',
          ],
        },
        {
          id: 'peroneal-motor-step',
          title: 'Nervio Peroneo Motor (PAMC)',
          content: `Principal estudio para evaluación de Pie Caído.

**Colocación de Electrodos:**
• **G1 (Activo):** Sobre el **Extensor Digitorum Brevis (EDB)** — dorso-lateral del pie.
• **G2 (Referencia):** Articulación MCF del 5to dedo o base del 5to metatarsiano.
• **Tierra:** Tobillo o dorso del pie.

**Puntos de Estimulación:**
1. **Tobillo:** 8 cm proximal al G1, lateral al tendón del tibial anterior.
2. **Cabeza de Peroné:** Justo DIStal y posterior a la cabeza del peroné.
3. **Hueco Poplíteo:** Borde lateral de la fosa poplítea, medial al tendón del bíceps femoral.

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| Latencia Motora Distal (LMD) | 4.0 - 5.5 ms | >6.3 ms |
| Amplitud (Base-Pico) | 3 - 6 mV | <2.0 mV |
| VCM a través de Peroné | 48 - 55 m/s | <40 m/s |`,
          clinicalPearls: [
            'Si el CMAP en EDB es muy bajo, registra en el **Tibial Anterior** (sitio opcional). G1 en la panza del músculo (proximal), G2 en el tendón (tobillo). Es más resistente a la atrofia distal.',
            'Cuidado con el Nervio Peroneo Accesorio: si el CMAP en rodilla es MAYOR que en tobillo, estimula detrás del maléolo lateral.',
          ],
        },
        {
          id: 'sural-sensory-step',
          title: 'Nervio Sural Sensitivo (PANS)',
          content: `El nervio sensitivo más importante para descartar polineuropatía.

**Colocación de Electrodos (Técnica Antidrómica):**
• **G1 (Activo):** Posterior o inferior al **maléolo lateral**.
• **G2 (Referencia):** 3-4 cm distal al G1 sobre el borde lateral del pie.
• **Tierra:** Entre estímulo y registro.

**Punto de Estimulación:**
• **Pantorrilla:** 14 cm proximal al G1, ligeramente lateral a la línea media posterior de la pierna.

**Configuración de Estímulo:**
• Duración: 0.1 ms.
• Promediación (Averaging): 10-20 trazos suelen ser necesarios.

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| Latencia Pico | 3.2 - 3.8 ms | >4.3 ms |
| Amplitud (Pico-Pico) | 10 - 25 µV | <5.0 µV (ajustar por edad) |
| Velocidad (VCS) | 45 - 55 m/s | <40 m/s |`,
          clinicalPearls: [
            'El SNAP sural disminuye fisiológicamente con la edad. En mayores de 70 años, un SNAP de 4 µV puede ser normal. Siempre comparar con el lado contralateral.',
            'Si no encuentras respuesta a 14 cm, intenta a 10 cm o mueve el estimulador medialmente.',
          ],
        },
        {
          id: 'median-sensory-step',
          title: 'Nervio Mediano Sensitivo (PANS)',
          content: `Estudio fundamental para el diagnóstico de STC.

**Colocación de Electrodos (Técnica Antidrómica):**
• **G1 (Activo):** Electrodo de anillo en la base del **2do o 3er dedo**.
• **G2 (Referencia):** Electrodo de anillo 3 cm distal al G1 en el mismo dedo.
• **Tierra:** Muñeca (entre estímulo y registro).

**Punto de Estimulación:**
• **Muñeca:** 14 cm proximal al G1, entre los tendones del Palmaris Longus y FCR.

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| Latencia Pico | 2.8 - 3.2 ms | >3.6 ms (a 14 cm) |
| Amplitud (Pico-Pico) | 20 - 60 µV | <15 µV |
| Velocidad (VCS) | 55 - 65 m/s | <50 m/s |`,
          clinicalPearls: [
            'Si el SNAP en el 2do dedo es normal pero sospechas STC leve, realiza el estudio comparativo en el **4to dedo** (mediano vs ulnar). Es mucho más sensible.',
          ],
        },
        {
          id: 'radial-sensory-step',
          title: 'Nervio Radial Sensitivo (PANS)',
          content: `Evaluación de la rama superficial del radial (SRN).

**Colocación de Electrodos:**
• **G1 (Activo):** Sobre el nervio en la **tabaquera anatómica** (extensor pollicis longus).
• **G2 (Referencia):** 3-4 cm distal al G1 sobre el trayecto del nervio.
• **Tierra:** Antebrazo.

**Punto de Estimulación:**
• **Antebrazo Lateral:** 10-12 cm proximal al G1, sobre el borde radial del radio.

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| Latencia Pico | 2.1 - 2.5 ms | >2.8 ms |
| Amplitud (Pico-Pico) | 30 - 60 µV | <15 µV |
| Velocidad (VCS) | 55 - 65 m/s | <50 m/s |`,
          clinicalPearls: [
            'El SNAP radial es robusto y se preserva en el STC. En la Queiralgia Parestésica (atrapamiento de la SRN por pulseras/relojes apretados), este SNAP está reducido o ausente.',
          ],
        },
        {
          id: 'tibial-motor-step',
          title: 'Nervio Tibial Motor (PAMC)',
          content: `Estudio base del miembro inferior y para evaluar la Onda F.

**Colocación de Electrodos:**
• **G1 (Activo):** Sobre el **Abductor Hallucis** — bajo el maléolo medial, borde medial del pie.
• **G2 (Referencia):** Base del 1er dedo (articulación MCF).
• **Tierra:** Tobillo.

**Puntos de Estimulación:**
1. **Tobillo:** Detrás y ligeramente proximal al **maléolo medial**.
2. **Hueco Poplíteo:** Línea media de la fosa poplítea (nervio profundo, requiere mayor intensidad).

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| Latencia Motora Distal (LMD) | 3.8 - 5.0 ms | >5.8 ms |
| Amplitud (Base-Pico) | 6 - 20 mV | <4.0 mV |
| Velocidad Conducción (VCM) | 42 - 55 m/s | <40 m/s |`,
          clinicalPearls: [
            'Para obtener una Onda F limpia, estimula en el tobillo con intensidad ligeramente superior a la supramáxima del CMAP y gira el cátodo hacia PROXIMAL.',
          ],
        },
        {
          id: 'radial-motor-step',
          title: 'Nervio Radial Motor (PAMC — EIP)',
          content: `Protocolo para evaluar surco espiral, PIN y parálisis del sábado por la noche.

**Colocación de Electrodos:**
• **G1 (Activo):** Extensor Indicis Proprius (EIP), tercio distal antebrazo dorsal.
• **G2 (Referencia):** Apófisis estiloides ulnar o dorso muñeca.
• **Tierra:** Dorso mano.

**Puntos de Estimulación:**
1. **Antebrazo:** 6-8 cm proximal al G1, cara lateral del radio.
2. **Codo:** Surco bicipital lateral.
3. **Surco espiral:** Cara lateral húmero tercio medio-distal.
4. **Axila/Erb:** Si sospecha lesión proximal.

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| LMD (EIP) | 2.5 - 3.2 ms | >3.5 ms |
| Amplitud (Base-Pico) | 5 - 10 mV | <4.0 mV |
| VCM antebrazo | 58 - 70 m/s | <50 m/s |
| Caída surco espiral | <20% | >50% = bloqueo |`,
          clinicalPearls: [
            'Braquiorradial preservado + muñeca caída = lesión surco espiral (Saturday Night Palsy).',
            'Muñeca y dedos normales + solo dedos débiles + sensitivo normal = PIN (arcada de Frohse).',
          ],
        },
        {
          id: 'ulnar-sensory-step',
          title: 'Nervio Ulnar Sensitivo (PANS)',
          content: `Estudio comparativo esencial para STC y neuropatía cubital.

**Colocación (Antidrómica):**
• **G1:** Anillo base 5º dedo. **G2:** 3-4 cm distal. **Tierra:** dorso mano.
• **Estimulación:** Muñeca 14 cm proximal, lateral al FCU.

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| Latencia Pico | 2.8 - 3.3 ms | >3.5 ms |
| Amplitud (Pico-Pico) | 15 - 50 µV | <10 µV |
| VCS | 55 - 65 m/s | <50 m/s |

**Rama dorsal cutánea ulnar:** estimular 10 cm proximal registro. Normal en canal de Guyon; reducida en codo.`,
          clinicalPearls: [
            'SNAP ulnar normal = control interno en STC (mediano afectado, ulnar normal).',
            'Rama dorsal normal + SNAP dedo 5 ausente = lesión canal de Guyon.',
          ],
        },
        {
          id: 'femoral-motor-step',
          title: 'Nervio Femoral Motor (PAMC)',
          content: `Evaluación de cuádriceps en plexopatía lumbar y neuropatía femoral iatrogénica.

**Colocación de Electrodos:**
• **G1:** Vasto medial, 4-6 cm sobre borde medial rótula.
• **G2:** Rótula o tendón cuádriceps.
• **Tierra:** Muslo lateral.

**Estimulación:** Pliegue inguinal, 1-2 cm **lateral** a arteria femoral (N-A-V-E-L). Duración 0.5-1.0 ms, presión firme.

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| LMD | 5.0 - 6.2 ms | >7.0 ms |
| Amplitud | 4 - 15 mV | <3.0 mV |
| Dif. lado a lado | <50% | >50% = significativo |`,
          clinicalPearls: [
            'Siempre comparar con contralateral. Hematoma iliopsoas + debilidad cuádriceps = urgencia.',
          ],
        },
        {
          id: 'superficial-peroneal-sensory-step',
          title: 'Nervio Peroneo Superficial Sensitivo (PANS)',
          content: `Clave para diferenciar neuropatía peronea (postganglionar) de radiculopatía L5.

**Colocación (Antidrómica):**
• **G1:** Dorso pie entre 1º y 2º metatarsiano. **G2:** 3-4 cm distal.
• **Estimulación:** Tercio inferior lateral pierna, 10-14 cm proximal.

**Valores Normales Esperados:**
| Parámetro | Valor Típico | Límite Patológico |
|---|---|---|
| Latencia Pico | 2.6 - 3.2 ms | >3.5 ms |
| Amplitud (Pico-Pico) | 14 - 26 µV | <8 µV |
| VCS | ≥40 m/s | <40 m/s |`,
          clinicalPearls: [
            'Reducido en neuropatía peronea cabeza peroné. Normal en radiculopatía L5 (preganglionar).',
            'Combinar con evaluación tibial posterior (EMG): débil = L5, no peroneo aislado.',
          ],
        },
        {
          id: 'ncs-config-table',
          title: 'Resumen de Configuración del Equipo (Filtros)',
          content: `Para obtener trazos espectaculares, la configuración de filtros es fundamental.

| Estudio | Filtro Bajo (LFF) | Filtro Alto (HFF) | Ganancia Típica |
|---|---|---|---|
| Motor (CMAP) | 2 - 10 Hz | 10 kHz | 2 - 5 mV/div |
| Sensitivo (SNAP) | 10 - 20 Hz | 2 - 3 kHz | 10 - 20 µV/div |
| Mixto (MNAP) | 10 Hz | 2 kHz | 20 - 50 µV/div |
| Onda F | 20 Hz | 10 kHz | 200 - 500 µV/div |

**Truco Profesional:** Aumentar la ganancia y disminuir el HFF para SNAPs pequeños ayuda a definir mejor el punto de inicio de la latencia.`,
        },
      ],
    },
  ],
};
