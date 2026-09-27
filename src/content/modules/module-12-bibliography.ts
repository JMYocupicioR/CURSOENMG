// src/content/modules/module-12-bibliography.ts
import { Module } from '../../types/content';

export const module12: Module = {
  id: 'bibliography',
  number: 12,
  title: 'Referencias y Bibliografía',
  titleEn: 'References and Bibliography',
  emoji: '📖',
  description: 'Catálogo de consulta. Las citas de cada tema están al final de ese tema; este módulo no suma al avance del curso.',
  descriptionEn: 'Consultation catalog. Each topic lists its own citations; this module does not count toward course progress.',
  color: 'from-stone-500 to-stone-700',
  icon: 'BookMarked',
  topics: [
    { id: 'textbooks', title: 'Libros de texto fundamentales', content: `**Preston DC, Shapiro BE.** Electromyography and Neuromuscular Disorders (4th ed). Elsevier, 2021 — El texto de referencia más utilizado en la formación. [Ver en Elsevier](https://www.elsevier.com/books/electromyography-and-neuromuscular-disorders/preston/978-0-323-66180-5)

**Kimura J.** Electrodiagnosis in Diseases of Nerve and Muscle (5th ed). Oxford, 2013 — Cobertura exhaustiva con énfasis fisiológico. [Ver en Oxford](https://global.oup.com/academic/product/electrodiagnosis-in-diseases-of-nerve-and-muscle-9780199738687)

**Dumitru D, Amato AA, Zwarts MJ.** Electrodiagnostic Medicine (2nd ed). Hanley & Belfus, 2002 — Referencia enciclopédica.

**Oh SJ.** Clinical Electromyography: Nerve Conduction Studies (3rd ed). Lippincott, 2003.

**Aminoff MJ.** Electrodiagnosis in Clinical Neurology (6th ed). Churchill Livingstone, 2012.` },
    { id: 'aanem-guidelines', title: 'Guías de la AANEM', content: `AANEM Practice Parameters para estudios electrodiagnósticos en:

• Síndrome del Túnel Carpiano
• Neuropatía Ulnar en el Codo
• Polineuropatía Simétrica Distal
• Radiculopatía
• ELA (Esclerosis Lateral Amiotrófica)

[Acceder a las Guías AANEM](https://www.aanem.org/Practice/Practice-Guidelines)

[Portal Educativo AANEM](https://www.aanem.org/Education)` },
    { id: 'efns-pns-guidelines', title: 'Guías EFNS/PNS (Europeas)', content: `**Van den Bergh PYK et al.** European Academy of Neurology/Peripheral Nerve Society guideline on diagnosis and treatment of CIDP. J Peripher Nerv Syst 2021. [PubMed](https://pubmed.ncbi.nlm.nih.gov/34085743/)

**Joint Task Force of the EFNS and the PNS.** Guideline on electrodiagnostic criteria for demyelinating neuropathies. [PubMed](https://pubmed.ncbi.nlm.nih.gov/20456718/)

**Cartwright MS et al.** Evidence-based guideline: Neuromuscular ultrasound for the diagnosis of carpal tunnel syndrome. Muscle Nerve 2012. [PubMed](https://pubmed.ncbi.nlm.nih.gov/22806370/)` },
    { id: 'classic-articles', title: 'Artículos clásicos y revisiones', content: `**Hadden RDM et al.** Electrophysiological classification of Guillain-Barré syndrome: clinical associations and outcome. Ann Neurol 1998. [PubMed](https://pubmed.ncbi.nlm.nih.gov/9721568/)

**De Carvalho M et al.** Electrodiagnostic criteria for diagnosis of ALS (Awaji criteria). Clin Neurophysiol 2008. [PubMed](https://pubmed.ncbi.nlm.nih.gov/18024328/)

**Shefner JM et al.** A proposal for new diagnostic criteria for ALS (Gold Coast criteria). Clin Neurophysiol 2020. [PubMed](https://pubmed.ncbi.nlm.nih.gov/32387013/)

**Ho TW et al.** Patterns of recovery in the Guillain-Barré syndromes. Neurology 1997. [PubMed](https://pubmed.ncbi.nlm.nih.gov/9153450/)

**Rajabally et al.** Electrophysiological categorization in GBS. J Peripher Nerv Syst 2015. [PubMed](https://pubmed.ncbi.nlm.nih.gov/26309146/)` },
    { id: 'atlases-videos', title: 'Atlas fotográficos y videos de técnica', content: `**Pease WS, Lew HL, Johnson EW.** Johnson's Practical Electromyography (4th ed). Lippincott Williams & Wilkins.

**Buschbacher RM, Prahlow ND.** Manual of Nerve Conduction Studies (2nd ed). Demos Medical.

**AANEM Annual Meeting Recordings** — Accesibles para miembros en [aanem.org](https://www.aanem.org)` },
    { id: 'online-resources', title: 'Recursos en línea y calculadoras', content: `[Neuromuscular Disease Center — Washington University](https://neuromuscular.wustl.edu/) — Base de datos completa de enfermedades neuromusculares.

[EMG & Neuromuscular Atlas](https://www.emgandneuromuscular.com/) — Atlas con videos y trazados EMG.

[AANEM Education Portal](https://www.aanem.org/Education) — Cursos acreditados CME.

[UpToDate — Electrodiagnostic Evaluation](https://www.uptodate.com/) — Revisiones clínicas actualizadas.` },
  ]
};
