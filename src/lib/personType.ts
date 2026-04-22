/**
 * Shared person-type resolver for records that may belong to either a student
 * or a staff member (e.g. health profiles, medical visits, vaccinations).
 *
 * Some legacy/imported rows have `person_type` set inconsistently with which
 * id field is actually populated. This utility prefers whichever id is present
 * and only falls back to the declared `person_type` when the row is ambiguous
 * (both ids present) or empty (neither present).
 */

export type PersonType = 'student' | 'staff';

export interface PersonTypeInput {
  person_type?: PersonType | string | null;
  student_id?: string | null;
  staff_id?: string | null;
}

export interface ResolvedPerson {
  /** The id field that should be used for lookups/joins. */
  resolvedType: PersonType;
  /** The id value matching `resolvedType` (may be undefined if neither id is set). */
  personId: string | undefined;
  /** True when both student_id AND staff_id are populated. */
  ambiguous: boolean;
  /** True when neither student_id nor staff_id is populated. */
  missing: boolean;
  /** True when the declared person_type disagrees with which id is populated. */
  mismatch: boolean;
}

export function resolvePersonType(record: PersonTypeInput): ResolvedPerson {
  const hasStudent = !!record.student_id;
  const hasStaff = !!record.staff_id;
  const declared = record.person_type === 'staff' ? 'staff'
    : record.person_type === 'student' ? 'student'
    : null;

  const resolvedType: PersonType =
    hasStudent && !hasStaff ? 'student'
    : hasStaff && !hasStudent ? 'staff'
    : (declared ?? 'student');

  const personId = (resolvedType === 'student' ? record.student_id : record.staff_id) || undefined;

  return {
    resolvedType,
    personId,
    ambiguous: hasStudent && hasStaff,
    missing: !hasStudent && !hasStaff,
    mismatch: declared !== null && declared !== resolvedType,
  };
}

/**
 * Predicate factory: returns a function that tests whether a related record
 * (visit, vaccination, etc.) belongs to the resolved person — strictly on the
 * same id field, so a mis-set person_type cannot cross-link sides.
 */
export function makePersonMatcher(resolved: Pick<ResolvedPerson, 'resolvedType' | 'personId'>) {
  return (record: { student_id?: string | null; staff_id?: string | null }) =>
    !!resolved.personId &&
    (resolved.resolvedType === 'student'
      ? record.student_id === resolved.personId
      : record.staff_id === resolved.personId);
}
