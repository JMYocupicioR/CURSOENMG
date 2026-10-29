import { handleSignAgreementRequest } from '../../server/signAgreementHandler';

export default async (req: Request) => handleSignAgreementRequest(req);
