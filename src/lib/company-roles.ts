import { CompanyType } from '@prisma/client';

type CompanyRoleRecord = {
  companyType?: CompanyType | null;
  isShipping?: boolean | null;
  isDispatch?: boolean | null;
  isTransit?: boolean | null;
};

export function companySupportsRole(
  company: CompanyRoleRecord | null | undefined,
  role: CompanyType,
) {
  if (!company) {
    return false;
  }

  if (role === 'SHIPPING') {
    return company.isShipping === true || company.companyType === 'SHIPPING';
  }

  if (role === 'DISPATCH') {
    return company.isDispatch === true || company.companyType === 'DISPATCH';
  }

  return company.isTransit === true || company.companyType === 'TRANSIT';
}