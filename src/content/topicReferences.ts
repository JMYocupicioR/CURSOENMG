// src/content/topicReferences.ts
// Per-topic bibliographic references mapped by moduleId → topicId
// All PubMed URLs verified via NCBI E-utilities API (March 2026)

export interface Reference {
  authors: string;
  title: string;
  journal: string;
  year: number | string;
  url?: string; // PubMed, DOI, or publisher URL
}

// References keyed by moduleId → topicId (first-level topic ID)
// The same refs apply to all children of that topic
export const topicReferences: Record<string, Record<string, Reference[]>> = {

  /* ── Module 1: Fundamentals ── */
  fundamentals: {
    'intro-neurodiagnostics': [
      { authors: 'Kimura J', title: 'Electrodiagnosis in Diseases of Nerve and Muscle: Principles and Practice', journal: 'Oxford University Press', year: 2013, url: 'https://global.oup.com/academic/product/electrodiagnosis-in-diseases-of-nerve-and-muscle-9780199738687' },
      { authors: 'Preston DC, Shapiro BE', title: 'Electromyography and Neuromuscular Disorders: Clinical-Electrophysiologic Correlations', journal: 'Elsevier', year: 2021, url: 'https://www.elsevier.com/books/electromyography-and-neuromuscular-disorders/preston/978-0-323-66180-5' },
    ],
    'electricity-basics': [
      { authors: 'Brown WF', title: 'The Physiological and Technical Basis of Electromyography', journal: 'Butterworth', year: 1984 },
      { authors: 'Kimura J', title: 'Electrodiagnosis in Diseases of Nerve and Muscle: Principles and Practice', journal: 'Oxford University Press', year: 2013, url: 'https://global.oup.com/academic/product/electrodiagnosis-in-diseases-of-nerve-and-muscle-9780199738687' },
    ],
    'functional-neuroanatomy': [
      { authors: 'Kimura J', title: 'Electrodiagnosis in Diseases of Nerve and Muscle: Principles and Practice', journal: 'Oxford University Press', year: 2013, url: 'https://global.oup.com/academic/product/electrodiagnosis-in-diseases-of-nerve-and-muscle-9780199738687' },
      { authors: 'Sunderland S', title: 'Nerves and Nerve Injuries', journal: 'Churchill Livingstone', year: 1978 },
    ],
    'muscle-contraction-physiology': [
      { authors: 'Kimura J', title: 'Electrodiagnosis in Diseases of Nerve and Muscle: Principles and Practice', journal: 'Oxford University Press', year: 2013, url: 'https://global.oup.com/academic/product/electrodiagnosis-in-diseases-of-nerve-and-muscle-9780199738687' },
      { authors: 'Brown WF', title: 'The Physiological and Technical Basis of Electromyography', journal: 'Butterworth', year: 1984 },
    ],
    '_default': [
      { authors: 'Preston DC, Shapiro BE', title: 'Electromyography and Neuromuscular Disorders: Clinical-Electrophysiologic Correlations', journal: 'Elsevier', year: 2021, url: 'https://www.elsevier.com/books/electromyography-and-neuromuscular-disorders/preston/978-0-323-66180-5' },
      { authors: 'Kimura J', title: 'Electrodiagnosis in Diseases of Nerve and Muscle: Principles and Practice', journal: 'Oxford University Press', year: 2013, url: 'https://global.oup.com/academic/product/electrodiagnosis-in-diseases-of-nerve-and-muscle-9780199738687' },
      { authors: 'Dumitru D, Amato AA, Zwarts MJ', title: 'Electrodiagnostic Medicine (2nd ed)', journal: 'Hanley & Belfus', year: 2002 },
      { authors: 'Oh SJ', title: 'Clinical Electromyography: Nerve Conduction Studies (3rd ed)', journal: 'Lippincott Williams & Wilkins', year: 2003 },
      { authors: 'Aminoff MJ', title: 'Electrodiagnosis in Clinical Neurology (6th ed)', journal: 'Churchill Livingstone', year: 2012 },
    ],
  },

  /* ── Module 2: Nerve Conduction ── */
  'nerve-conduction': {
    '_default': [
      { authors: 'Chen S, Andary M, Buschbacher R, Del Toro D, Smith B, So Y, et al.', title: 'Electrodiagnostic reference values for upper and lower limb nerve conduction studies in adult populations', journal: 'Muscle & Nerve', year: 2016, url: 'https://doi.org/10.1002/mus.25203' },
      { authors: 'Dillingham T, Chen S, Andary M, Buschbacher R, Del Toro D, Smith B, et al.', title: 'Establishing high-quality reference values for nerve conduction studies: A report from the normative data task force of the AANEM', journal: 'Muscle & Nerve', year: 2016, url: 'https://doi.org/10.1002/mus.25204' },
      { authors: 'Kimura J', title: 'Electrodiagnosis in Diseases of Nerve and Muscle: Principles and Practice', journal: 'Oxford University Press', year: 2013, url: 'https://global.oup.com/academic/product/electrodiagnosis-in-diseases-of-nerve-and-muscle-9780199738687' },
      { authors: 'Preston DC, Shapiro BE', title: 'Electromyography and Neuromuscular Disorders: Clinical-Electrophysiologic Correlations', journal: 'Elsevier', year: 2021, url: 'https://www.elsevier.com/books/electromyography-and-neuromuscular-disorders/preston/978-0-323-66180-5' },
    ],
  },

  /* ── Module 3: EMG Needle ── */
  'emg-needle': {
    '_default': [
      { authors: 'Daube JR, Rubin DI', title: 'Needle electromyography', journal: 'Muscle & Nerve', year: 2009, url: 'https://doi.org/10.1002/mus.21180' },
      { authors: 'Dumitru D', title: 'Physiologic basis of potentials recorded in electromyography', journal: 'Muscle & Nerve', year: 2000, url: 'https://pubmed.ncbi.nlm.nih.gov/11054745/' },
      { authors: 'Stålberg E, Nandedkar S, Sanders D, Falck B', title: 'Quantitative motor unit potential analysis', journal: 'Journal of Clinical Neurophysiology', year: 1996, url: 'https://pubmed.ncbi.nlm.nih.gov/8897206/' },
      { authors: 'Buchthal F, Rosenfalck P', title: 'Action potential parameters in different human muscles', journal: 'Acta Psychiatrica Scandinavica', year: 1955 },
      { authors: 'Pease WS, Lew HL, Johnson EW', title: "Johnson's Practical Electromyography (4th ed)", journal: 'Lippincott Williams & Wilkins', year: 2007 },
      { authors: 'Buschbacher RM, Prahlow ND', title: 'Manual of Nerve Conduction Studies (2nd ed)', journal: 'Demos Medical', year: 2006 },
    ],
  },

  /* ── Module 4: Late Responses ── */
  'late-responses': {
    '_default': [
      { authors: 'Fisher MA', title: 'AAEM Minimonograph #13: H reflexes and F waves: physiology and clinical indications', journal: 'Muscle & Nerve', year: 1992, url: 'https://doi.org/10.1002/mus.880150402' },
      { authors: 'Braddom RL, Johnson EW', title: 'Standardization of H reflex and diagnostic use in S1 radiculopathy', journal: 'Archives of Physical Medicine and Rehabilitation', year: 1974 },
      { authors: 'Pease WS, Kozakiewicz R, Johnson EW', title: 'Central loop of the H reflex. Normal values and use in S1 radiculopathy', journal: 'American Journal of Physical Medicine & Rehabilitation', year: 1997 },
      { authors: 'Jabre JF', title: 'Surface recording of the H-reflex of the flexor carpi radialis', journal: 'Muscle & Nerve', year: 1981 },
    ],
  },

  /* ── Module 5: Repetitive Stimulation ── */
  'repetitive-stimulation': {
    '_default': [
      { authors: 'Chiou-Tan FY, Tim RW, Gilchrist JM, Weber CF, Wilson JR, et al.', title: 'Literature review of the usefulness of repetitive nerve stimulation and single fiber EMG in the electrodiagnostic evaluation of patients with suspected myasthenia gravis or Lambert-Eaton myasthenic syndrome', journal: 'Muscle & Nerve', year: 2001, url: 'https://doi.org/10.1002/mus.1140' },
      { authors: 'Stålberg E, Sanders DB, Ali S, et al.', title: 'Reference values for jitter recorded by concentric needle electrodes in healthy controls: a multicenter study', journal: 'Muscle & Nerve', year: 2016, url: 'https://pubmed.ncbi.nlm.nih.gov/26112058/' },
      { authors: 'Keesey JC', title: 'AAEM Minimonograph #33: Electrodiagnostic Approach to Defects of Neuromuscular Transmission', journal: 'Muscle & Nerve', year: 1989 },
      { authors: 'Engel AG', title: 'Lambert-Eaton myasthenic syndrome', journal: 'Annals of Neurology', year: 1987 },
    ],
  },

  /* ── Module 6: Evoked Potentials ── */
  'evoked-potentials': {
    '_default': [
      { authors: 'Yiannikas C, Vucic S', title: 'Utility of somatosensory evoked potentials in chronic acquired demyelinating neuropathy', journal: 'Muscle & Nerve', year: 2008, url: 'https://doi.org/10.1002/mus.21093' },
      { authors: 'Devic P, Petiot P, Mauguiere F', title: 'Diagnostic utility of somatosensory evoked potentials in chronic polyradiculopathy without electrodiagnostic signs of peripheral demyelination', journal: 'Muscle & Nerve', year: 2016, url: 'https://doi.org/10.1002/mus.24989' },
      { authors: 'Cobos E, Burgos J', title: 'Potenciales Evocados multimodales en población Mexicana sana de 17 a 64 años', journal: 'Universidad Nacional Autónoma de México', year: 2014 },
    ],
  },

  /* ── Module 7: Special Studies ── */
  'special-studies': {
    '_default': [
      { authors: 'Walker F, Cartwright MS', title: 'Neuromuscular Ultrasound', journal: 'Saunders', year: 2011 },
      { authors: 'Boon AJ, Alsharif KI, Harper CM, Smith J', title: 'Ultrasound-guided needle EMG of the diaphragm: technique description and case report', journal: 'Muscle & Nerve', year: 2008, url: 'https://doi.org/10.1002/mus.21187' },
      { authors: 'Low PA', title: 'Testing the autonomic nervous system', journal: 'Seminars in Neurology', year: 2003, url: 'https://doi.org/10.1055/s-2004-817725' },
      { authors: 'Ravits JM', title: 'AAEM minimonograph #48: autonomic nervous system testing', journal: 'Muscle & Nerve', year: 1997 },
      { authors: 'Nandedkar SD, Barkhaus PE, Stålberg EV', title: 'Motor unit number index (MUNIX): principle, method, and findings in healthy subjects and in patients with motor neuron disease', journal: 'Muscle & Nerve', year: 2010, url: 'https://doi.org/10.1002/mus.21824' },
    ],
  },

  /* ── Module 8: Topographic Anatomy ── */
  'topographic-anatomy': {
    '_default': [
      { authors: 'Haymaker W, Woodhall B', title: 'Peripheral Nerve Injuries', journal: 'WB Saunders, Philadelphia', year: 1953 },
      { authors: 'Sunderland S', title: 'Nerves and Nerve Injuries', journal: 'Churchill Livingstone', year: 1978 },
      { authors: "O'Brien MD", title: 'Aids to the Examination of the Peripheral Nervous System', journal: 'Baillière Tindall, London', year: 1986 },
      { authors: 'DeLisa J, Lee HJ', title: 'Manual Of Nerve Conduction Study And Surface Anatomy For Needle Electromyography (4th ed)', journal: 'Lippincott Williams & Wilkins', year: 2017 },
    ],
  },

  /* ── Module 9: Pathologies ── */
  pathologies: {
    'peripheral-neuropathies': [
      { authors: 'England JD, Gronseth GS, Franklin G, et al.', title: 'Distal symmetric polyneuropathy: a definition for clinical research', journal: 'Neurology', year: 2005, url: 'https://pubmed.ncbi.nlm.nih.gov/15668414/' },
      { authors: 'Callaghan BC, Price RS, Feldman EL', title: 'Distal symmetric polyneuropathy: a review', journal: 'JAMA', year: 2015, url: 'https://pubmed.ncbi.nlm.nih.gov/26599185/' },
      { authors: 'Donofrio PD, Albers JW', title: 'AAEM minimonograph no. 34: polyneuropathy: classification by nerve conduction studies and electromyography', journal: 'Muscle & Nerve', year: 1990, url: 'https://pubmed.ncbi.nlm.nih.gov/2172810/' },
      { authors: 'Tankisi H, Pugdahl K, Fuglsang-Frederiksen A, et al.', title: 'Pathophysiology inferred from electrodiagnostic nerve tests and classification of polyneuropathies. Suggested guidelines', journal: 'Clinical Neurophysiology', year: 2005, url: 'https://pubmed.ncbi.nlm.nih.gov/16516542/' },
    ],
    'inflammatory-neuropathies': [
      { authors: 'Van den Bergh PYK, van Doorn PA, Hadden RDM, et al.', title: 'EAN/PNS guideline on diagnosis and treatment of chronic inflammatory demyelinating polyradiculoneuropathy: Second revision', journal: 'European Journal of Neurology', year: 2023, url: 'https://pubmed.ncbi.nlm.nih.gov/38873949/' },
      { authors: 'Hadden RD, Cornblath DR, Hughes RA, et al.', title: 'Electrophysiological classification of Guillain-Barré syndrome: Clinical associations and outcome', journal: 'Annals of Neurology', year: 1998, url: 'https://pubmed.ncbi.nlm.nih.gov/9818934/' },
      { authors: 'Asbury AK, Cornblath DR', title: 'Assessment of current diagnostic criteria for Guillain-Barré syndrome', journal: 'Annals of Neurology', year: 1990, url: 'https://pubmed.ncbi.nlm.nih.gov/2336810/' },
      { authors: 'Ho TW, Mishu B, Li CY, Gao CY, Cornblath DR, Griffin JW, et al.', title: 'Guillain-Barré syndrome in northern China. Relationship to Campylobacter jejuni infection and anti-glycolipid antibodies', journal: 'Brain', year: 1995, url: 'https://doi.org/10.1093/brain/118.3.597' },
    ],
    'mononeuropathies': [
      { authors: 'AANEM, AAN, AAPM&R', title: 'Practice parameter for electrodiagnostic studies in carpal tunnel syndrome: summary statement', journal: 'Muscle & Nerve', year: 2002, url: 'https://doi.org/10.1002/mus.10185' },
      { authors: 'Stevens JC', title: 'AAEM minimonograph #26: the electrodiagnosis of carpal tunnel syndrome', journal: 'Muscle & Nerve', year: 1997, url: 'https://pubmed.ncbi.nlm.nih.gov/9390659/' },
      { authors: 'Kincaid JC', title: 'AAEE minimonograph no. 31: the electrodiagnosis of ulnar neuropathy at the elbow', journal: 'Muscle & Nerve', year: 1988, url: 'https://pubmed.ncbi.nlm.nih.gov/2847038/' },
      { authors: 'Campbell WW, Pridgeon RM, Sahni SK', title: 'Short segment incremental studies in the evaluation of ulnar neuropathy at the elbow', journal: 'Muscle & Nerve', year: 1992, url: 'https://pubmed.ncbi.nlm.nih.gov/1518514/' },
    ],
    'motor-neuron-diseases': [
      { authors: 'Shefner JM, Al-Chalabi A, Baker MR, et al.', title: 'A proposal for new diagnostic criteria for ALS (Gold Coast criteria)', journal: 'Clinical Neurophysiology', year: 2020, url: 'https://pubmed.ncbi.nlm.nih.gov/32387049/' },
      { authors: 'Vucic S, Ferguson TA, Cummings C, et al.', title: 'Gold Coast diagnostic criteria: implications for ALS diagnosis and clinical trial enrollment', journal: 'Muscle & Nerve', year: 2021, url: 'https://doi.org/10.1002/mus.27392' },
      { authors: 'de Carvalho M, Dengler R, Eisen A, et al.', title: 'Electrodiagnostic criteria for diagnosis of ALS (Awaji criteria)', journal: 'Clinical Neurophysiology', year: 2008, url: 'https://doi.org/10.1016/j.clinph.2007.11.169' },
      { authors: 'Brooks BR', title: 'El Escorial world federation of neurology criteria for the diagnosis of amyotrophic lateral sclerosis', journal: 'Journal of the Neurological Sciences', year: 1994, url: 'https://doi.org/10.1016/0022-510X(94)90191-0' },
    ],
    'myopathies': [
      { authors: 'Dalakas MC', title: 'Polymyositis, dermatomyositis, and inclusion-body myositis', journal: 'New England Journal of Medicine', year: 1991, url: 'https://doi.org/10.1056/NEJM199111213252106' },
      { authors: 'Amato AA, Barohn RJ', title: 'Evaluation and treatment of inflammatory myopathies', journal: 'Journal of Neurology, Neurosurgery & Psychiatry', year: 2009, url: 'https://doi.org/10.1136/jnnp.2008.169375' },
      { authors: 'Fuglsang-Frederiksen A', title: 'The role of different EMG methods in evaluating myopathy', journal: 'Clinical Neurophysiology', year: 2006, url: 'https://doi.org/10.1016/j.clinph.2005.12.018' },
      { authors: 'Lacomis D', title: 'Electrodiagnostic approach to the patient with suspected myopathy', journal: 'Neurologic Clinics of North America', year: 2002, url: 'https://pubmed.ncbi.nlm.nih.gov/12092463/' },
    ],
    'radiculopathies': [
      { authors: 'Dillingham TR, Annaswamy TM, Plastaras CT', title: 'AANEM monograph: Evaluation of persons with suspected lumbosacral and cervical radiculopathy (Part 1)', journal: 'Muscle & Nerve', year: 2020, url: 'https://pubmed.ncbi.nlm.nih.gov/32557709/' },
      { authors: 'Cho SC, Ferrante MA, Levin KH, Harmon RL, So YT', title: 'Utility of electrodiagnostic testing in evaluating patients with lumbosacral radiculopathy: an evidence-based review', journal: 'Muscle & Nerve', year: 2010, url: 'https://pubmed.ncbi.nlm.nih.gov/20658602/' },
      { authors: 'Wilbourn AJ, Aminoff MJ', title: 'AAEE Minimonograph #32: The electrophysiologic examination in patients with radiculopathies', journal: 'Muscle & Nerve', year: 1988, url: 'https://doi.org/10.1002/mus.880110905' },
      { authors: 'Levin KH', title: 'Electrodiagnostic approach to the patient with suspected radiculopathy', journal: 'Neurologic Clinics', year: 2002, url: 'https://pubmed.ncbi.nlm.nih.gov/12152440/' },
    ],
    'plexopathies': [
      { authors: 'Van Eijk JJ, Groothuis JT, Van Alfen N', title: 'Neuralgic amyotrophy: an update on diagnosis, pathophysiology, and treatment', journal: 'Muscle & Nerve', year: 2016, url: 'https://pubmed.ncbi.nlm.nih.gov/26662794/' },
      { authors: 'Ferrante MA, Wilbourn AJ', title: 'Lesion distribution among 281 patients with sporadic neuralgic amyotrophy', journal: 'Muscle & Nerve', year: 2017, url: 'https://pubmed.ncbi.nlm.nih.gov/27680713/' },
      { authors: 'Evans BA, Stevens JC, Dyck PJ', title: 'Lumbosacral plexus neuropathy', journal: 'Neurology', year: 1981 },
      { authors: 'Dyck PJB, Norell JE, Dyck PJ', title: 'Microvasculitis and ischemia in diabetic lumbosacral radiculoplexus neuropathy', journal: 'Neurology', year: 1999 },
    ],
    'nmj-disorders': [
      { authors: 'Chiou-Tan FY, Tim RW, Gilchrist JM, et al.', title: 'Repetitive nerve stimulation and single fiber EMG in myasthenia gravis or Lambert-Eaton syndrome', journal: 'Muscle & Nerve', year: 2001, url: 'https://doi.org/10.1002/mus.1140' },
      { authors: 'Stålberg E, Sanders DB, Ali S, et al.', title: 'Reference values for jitter recorded by concentric needle electrodes in healthy controls', journal: 'Muscle & Nerve', year: 2016, url: 'https://pubmed.ncbi.nlm.nih.gov/26112058/' },
      { authors: 'Engel AG', title: 'Lambert-Eaton myasthenic syndrome', journal: 'Annals of Neurology', year: 1987 },
    ],
  },

  /* ── Module 10: Diagnostic Criteria ── */
  'diagnostic-criteria': {
    'cidp-criteria': [
      { authors: 'Van den Bergh PYK, van Doorn PA, Hadden RDM, et al.', title: 'EAN/PNS guideline on diagnosis and treatment of chronic inflammatory demyelinating polyradiculoneuropathy: Second revision', journal: 'European Journal of Neurology', year: 2023, url: 'https://pubmed.ncbi.nlm.nih.gov/38873949/' },
      { authors: 'Joint Task Force of the EFNS and the PNS', title: 'European Federation of Neurological Societies/Peripheral Nerve Society guideline on management of chronic inflammatory demyelinating polyradiculoneuropathy', journal: 'Journal of the Peripheral Nervous System', year: 2010, url: 'https://pubmed.ncbi.nlm.nih.gov/20456718/' },
    ],
    'als-criteria': [
      { authors: 'Shefner JM, Al-Chalabi A, Baker MR, et al.', title: 'A proposal for new diagnostic criteria for ALS (Gold Coast criteria)', journal: 'Clinical Neurophysiology', year: 2020, url: 'https://pubmed.ncbi.nlm.nih.gov/32387049/' },
      { authors: 'de Carvalho M, Dengler R, Eisen A, et al.', title: 'Electrodiagnostic criteria for diagnosis of ALS (Awaji criteria)', journal: 'Clinical Neurophysiology', year: 2008, url: 'https://doi.org/10.1016/j.clinph.2007.11.169' },
      { authors: 'Brooks BR', title: 'El Escorial world federation of neurology criteria for the diagnosis of amyotrophic lateral sclerosis', journal: 'Journal of the Neurological Sciences', year: 1994, url: 'https://doi.org/10.1016/0022-510X(94)90191-0' },
    ],
    'gbs-subtypes': [
      { authors: 'Hadden RD, Cornblath DR, Hughes RA, et al.', title: 'Electrophysiological classification of Guillain-Barré syndrome: Clinical associations and outcome', journal: 'Annals of Neurology', year: 1998, url: 'https://pubmed.ncbi.nlm.nih.gov/9818934/' },
      { authors: 'Ho TW, Mishu B, Li CY, Gao CY, Cornblath DR, Griffin JW, et al.', title: 'Guillain-Barré syndrome in northern China. Relationship to Campylobacter jejuni infection and anti-glycolipid antibodies', journal: 'Brain', year: 1995, url: 'https://doi.org/10.1093/brain/118.3.597' },
      { authors: 'Rajabally YA et al.', title: 'Electrophysiological categorization in Guillain-Barré syndrome', journal: 'Journal of the Peripheral Nervous System', year: 2015, url: 'https://pubmed.ncbi.nlm.nih.gov/26309146/' },
    ],
    '_default': [
      { authors: 'Chen S, Andary M, Buschbacher R, et al.', title: 'Electrodiagnostic reference values for upper and lower limb nerve conduction studies in adult populations', journal: 'Muscle & Nerve', year: 2016, url: 'https://doi.org/10.1002/mus.25203' },
      { authors: 'Dillingham T, Chen S, Andary M, et al.', title: 'Establishing high quality reference values for nerve conduction studies (AANEM Normative Data Task Force)', journal: 'Muscle & Nerve', year: 2016, url: 'https://doi.org/10.1002/mus.25204' },
      { authors: 'Preston DC, Shapiro BE', title: 'Electromyography and Neuromuscular Disorders (4th ed)', journal: 'Elsevier', year: 2021, url: 'https://www.elsevier.com/books/electromyography-and-neuromuscular-disorders/preston/978-0-323-66180-5' },
      { authors: 'Buschbacher RM, Kumbhare D, Robinson L', title: "Buschbacher's Manual of Nerve Conduction Studies (3rd ed)", journal: 'Demos Medical', year: 2015 },
    ],
  },

  /* ── Module 11: Quick Reference ── */
  'quick-reference': {
    '_default': [
      { authors: 'Preston DC, Shapiro BE', title: 'Electromyography and Neuromuscular Disorders (4th ed)', journal: 'Elsevier', year: 2021, url: 'https://www.elsevier.com/books/electromyography-and-neuromuscular-disorders/preston/978-0-323-66180-5' },
      { authors: 'Kimura J', title: 'Electrodiagnosis in Diseases of Nerve and Muscle (5th ed)', journal: 'Oxford University Press', year: 2013, url: 'https://global.oup.com/academic/product/electrodiagnosis-in-diseases-of-nerve-and-muscle-9780199738687' },
    ],
  },

  /* ── Module 13: Safety & QC ── */
  'safety-qc': {
    '_default': [
      { authors: 'London ZN', title: 'Safety and pain in electrodiagnostic studies', journal: 'Muscle & Nerve', year: 2017, url: 'https://doi.org/10.1002/mus.25421' },
      { authors: 'Al-Shekhlee A, Shapiro BE, Preston DC', title: 'Iatrogenic complications and risks of nerve conduction studies and needle electromyography', journal: 'Muscle & Nerve', year: 2003, url: 'https://pubmed.ncbi.nlm.nih.gov/12707972/' },
      { authors: 'Boon AJ, Gertken JT, Watson JC, et al.', title: 'Hematoma risk after needle electromyography', journal: 'Muscle & Nerve', year: 2012, url: 'https://doi.org/10.1002/mus.22227' },
      { authors: 'Kassardjian CD, O\'Gorman CM, Sorenson EJ', title: 'The risk of iatrogenic pneumothorax after electromyography', journal: 'Muscle & Nerve', year: 2016, url: 'https://doi.org/10.1002/mus.24999' },
      { authors: 'Schoeck AP, Mellion ML, Gilchrist JM, et al.', title: 'Safety of nerve conduction studies in patients with implanted cardiac devices', journal: 'Muscle & Nerve', year: 2007, url: 'https://doi.org/10.1002/mus.20690' },
      { authors: 'McClellan C, McLaughlin M', title: 'Quality in Electrodiagnostic Studies: A Guide for Referring Physicians', journal: 'Missouri Medicine', year: 2019 },
    ],
  },

  'pathology-updates': {
    'cidp-criteria-update': [
      { authors: 'Van den Bergh PYK, van Doorn PA, Hadden RDM, et al.', title: 'EAN/PNS guideline on diagnosis and treatment of chronic inflammatory demyelinating polyradiculoneuropathy: Second revision', journal: 'European Journal of Neurology', year: 2023, url: 'https://pubmed.ncbi.nlm.nih.gov/38873949/' },
    ],
    'als-criteria-update': [
      { authors: 'Shefner JM, Al-Chalabi A, Baker MR, et al.', title: 'A proposal for new diagnostic criteria for ALS (Gold Coast criteria)', journal: 'Clinical Neurophysiology', year: 2020, url: 'https://pubmed.ncbi.nlm.nih.gov/32387049/' },
      { authors: 'de Carvalho M, Dengler R, Eisen A, et al.', title: 'Electrodiagnostic criteria for diagnosis of ALS (Awaji criteria)', journal: 'Clinical Neurophysiology', year: 2008, url: 'https://doi.org/10.1016/j.clinph.2007.11.169' },
    ],
  },
};

function specificReferences(moduleId: string, topicId: string): Reference[] {
  const list = topicReferences[moduleId]?.[topicId];
  return list?.length ? list : [];
}

function defaultReferences(moduleId: string): Reference[] {
  return topicReferences[moduleId]?.['_default'] ?? [];
}

/**
 * References for a topic.
 * Order: this topic, then each ancestor from nearest to farthest, then the module default.
 * `_default` is not used while a more specific list exists.
 */
export function getReferencesForTopic(
  moduleId: string,
  topicId: string,
  ancestorIds: string[] = []
): Reference[] {
  return resolveTopicReferences(
    moduleId,
    { id: topicId },
    ancestorIds.map((id) => ({ id }))
  );
}

/** Same resolution, but a topic's own `references` (published by a teacher) wins over the static map. */
export function resolveTopicReferences(
  moduleId: string,
  topic: { id: string; references?: Reference[] },
  ancestors: Array<{ id: string; references?: Reference[] }> = []
): Reference[] {
  if (topic.references?.length) return topic.references;
  const own = specificReferences(moduleId, topic.id);
  if (own.length) return own;

  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const ancestor = ancestors[i];
    if (ancestor.references?.length) return ancestor.references;
    const inherited = specificReferences(moduleId, ancestor.id);
    if (inherited.length) return inherited;
  }

  return defaultReferences(moduleId);
}

/** Drop blank rows. A citation needs author and title. */
export function normalizeReferences(rows: Array<Partial<Reference>> | undefined): Reference[] {
  if (!rows?.length) return [];
  const out: Reference[] = [];
  for (const row of rows) {
    const authors = row.authors?.trim() ?? '';
    const title = row.title?.trim() ?? '';
    if (!authors || !title) continue;
    const yearText = row.year === undefined || row.year === null ? '' : String(row.year).trim();
    const year = /^\d{4}$/.test(yearText) ? Number(yearText) : yearText;
    const url = row.url?.trim();
    out.push({
      authors,
      title,
      journal: row.journal?.trim() ?? '',
      year: year || 's. f.',
      ...(url ? { url } : {}),
    });
  }
  return out;
}
