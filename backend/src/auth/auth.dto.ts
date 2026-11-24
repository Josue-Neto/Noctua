import {
  ArrayMinSize,
  IsInt,
  IsArray,
  IsEmail,
  IsIn,
  MaxLength,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  Max,
  Min,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { UserRole } from './auth.types';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class RequestPasswordResetDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class AcceptInvitationDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  full_name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class InvitationSubjectDto {
  @IsUUID()
  class_id!: string;

  @IsUUID()
  subject_id!: string;
}

export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(['student', 'teacher', 'coordinator'])
  role!: UserRole;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  class_ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvitationSubjectDto)
  subjects?: InvitationSubjectDto[];
}

export class CreateClassDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  school_year!: number;
}

export class AddClassSubjectDto {
  @IsString()
  @Length(1, 100)
  subject_name!: string;
}
