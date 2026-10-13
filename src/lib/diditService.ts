/**
 * Service to interact with Didit Identity Verification API (v3)
 * Provides session creation, status polling, and field extraction for Admission and Staff forms.
 */

export interface DiditSessionResponse {
  session_id: string;
  session_number: number;
  session_token: string;
  url: string;
  status: string;
  workflow_id: string;
}

export interface DiditExtractedData {
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  fatherName?: string;
  motherName?: string;
  nationality?: string;
  documentType?: string;
  status?: string;
  isAuthentic?: boolean;
  warnings?: string[];
}

export const DIDIT_DEFAULT_API_KEY = 'oh4x2lCr8hnNmjMBjWY4fn3MGY-pzZ4ircZmx7uBvVo';
export const DIDIT_DEFAULT_WORKFLOW_ID = '7f7de0ab-b184-43e1-a643-dd157beb7698';

/**
 * Creates a new Didit verification session.
 */
export async function createDiditSession(apiKey = DIDIT_DEFAULT_API_KEY, workflowId = DIDIT_DEFAULT_WORKFLOW_ID): Promise<DiditSessionResponse> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch('https://verification.didit.me/v3/session/', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      callback: `${currentOrigin}/didit-callback`,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || errorJson.error || `Failed to create verification session (${response.status})`);
  }

  return response.json();
}

/**
 * Retrieves the decision / result for a given session.
 */
export async function getDiditSessionDecision(sessionId: string, apiKey = DIDIT_DEFAULT_API_KEY): Promise<any> {
  const response = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || errorJson.error || `Failed to fetch session decision (${response.status})`);
  }

  return response.json();
}

/**
 * Formats and normalizes data extracted by Didit ID verification into a clean structure.
 */
export function parseDiditDecision(decision: any): DiditExtractedData {
  const result: DiditExtractedData = {
    status: decision.status,
    isAuthentic: decision.status === 'Approved',
    warnings: [],
  };

  const idVerifications = decision.id_verifications || [];
  if (idVerifications.length > 0) {
    const idDoc = idVerifications[0];
    result.documentNumber = idDoc.document_number || idDoc.personal_number || '';
    result.firstName = idDoc.first_name || '';
    result.lastName = idDoc.last_name || '';
    result.fullName = [idDoc.first_name, idDoc.last_name].filter(Boolean).join(' ') || idDoc.full_name || '';
    result.dateOfBirth = idDoc.date_of_birth || '';
    result.gender = idDoc.gender === 'M' || idDoc.gender === 'Male' ? 'male' : idDoc.gender === 'F' || idDoc.gender === 'Female' ? 'female' : '';
    result.nationality = idDoc.nationality || idDoc.issuing_country || '';
    result.documentType = idDoc.document_type || '';

    if (idDoc.parsed_address) {
      if (typeof idDoc.parsed_address === 'string') {
        result.address = idDoc.parsed_address;
      } else if (typeof idDoc.parsed_address === 'object') {
        result.address = Object.values(idDoc.parsed_address).filter(Boolean).join(', ');
      }
    } else if (idDoc.address) {
      result.address = typeof idDoc.address === 'string' ? idDoc.address : JSON.stringify(idDoc.address);
    }

    if (Array.isArray(idDoc.warnings)) {
      result.warnings = idDoc.warnings.map((w: any) => (typeof w === 'string' ? w : w.code || w.description || JSON.stringify(w)));
    }
  }

  return result;
}
