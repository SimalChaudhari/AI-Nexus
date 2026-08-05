import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Single staff learner — fields match createblukuserfornexus sample. */
export class CorporateStaffLearnerDto {
  @IsString()
  @IsOptional()
  salutation?: string;

  @IsString()
  first_name!: string;

  @IsString()
  last_name!: string;

  @IsString()
  @IsOptional()
  name_as_per_id?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  id_type?: string;

  @IsString()
  @IsOptional()
  id_number?: string;

  /** Auto-filled from HR company when omitted */
  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  jobFunction?: string;

  @IsString()
  @IsOptional()
  countryOfResidence?: string;

  @IsNumber()
  @Type(() => Number)
  noOfYearOfRelevantWorkExperience?: number;

  /** Auto-filled from HR Salesforce account when omitted */
  @IsString()
  @IsOptional()
  corporateAccountId?: string;

  @IsString()
  @IsOptional()
  learnerAsAnAccounting?: string;

  @IsString()
  @IsOptional()
  membershipNumber?: string;

  /** Citizenship — Singapore Citizen / Singapore PR */
  @IsString()
  @IsOptional()
  eligibility?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  organisationType?: string;

  /** ISCA member / Non-member */
  @IsString()
  @IsOptional()
  iscaMemberStatus?: string;

  /** Membership of other accounting bodies (only if non ISCA member) */
  @IsString()
  @IsOptional()
  otherAccountingBodies?: string;

  /** HR authorisation checkbox — must be true before enrolment is accepted. */
  @IsOptional()
  @IsBoolean()
  @Equals(true, {
    message: 'You must confirm authorisation before submitting enrolment.',
  })
  @Type(() => Boolean)
  isAuthorisedSubmit?: boolean;
}

export class CorporateStaffBulkEnrolDto {
  /** HR authorisation checkbox for the whole bulk submission. */
  @IsBoolean()
  @Equals(true, {
    message: 'You must confirm authorisation before submitting enrolment.',
  })
  @Type(() => Boolean)
  isAuthorisedSubmit!: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CorporateStaffLearnerDto)
  learners!: CorporateStaffLearnerDto[];
}
