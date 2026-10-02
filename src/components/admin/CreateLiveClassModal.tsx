import {
  ClassSetupWizardModal,
  type ClassSetupWizardModalProps,
} from './ClassSetupWizardModal';

export type CreateLiveClassModalProps = ClassSetupWizardModalProps;

/**
 * Gestor de Clases en Vivo y Asistente Guiado (Wizard) para NeuroSAFE / ElectroDx.
 * Soporta de forma transparente el "Modo Guiado (Fácil)" paso a paso y el "Modo Avanzado (Técnico)",
 * permitiendo alternar entre ambos sin pérdida de datos.
 */
export function CreateLiveClassModal(props: CreateLiveClassModalProps) {
  return <ClassSetupWizardModal {...props} />;
}

export default CreateLiveClassModal;
