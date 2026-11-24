import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { InvitationSubjectDto } from '../auth/auth.dto';

export class LinkDto {
  @IsString() @Length(1, 100) name!: string;
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}
export class ActivityDto {
  @IsUUID() classSubjectId!: string;
  @IsString() @Length(1, 200) title!: string;
  @IsString() @MaxLength(10000) detail!: string;
  @IsIn(['assignment', 'exam', 'event', 'notice']) type!: string;
  @IsISO8601({ strict: true }) dueAt!: string;
  @IsIn(['draft', 'published']) status!: string;
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  attachments!: LinkDto[];
}
export class ActivityQuery {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsUUID() classId?: string;
  @IsOptional() @IsUUID() subjectId?: string;
  @IsOptional() @IsIn(['assignment', 'exam', 'event', 'notice']) type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number =
    100;
}
export class ChecklistDto {
  @IsBoolean() completed!: boolean;
}
export class ProfileDto {
  @IsOptional() @IsString() @Length(2, 100) name?: string;
  @IsOptional() @IsString() @MaxLength(240) bio?: string;
  @IsOptional() @IsString() @MaxLength(2048) avatar?: string;
}
export class PreferencesDto {
  @IsOptional() @IsIn(['system', 'light', 'dark']) theme?: string;
  @IsOptional() @IsBoolean() highContrast?: boolean;
  @IsOptional() @IsBoolean() dyslexiaFont?: boolean;
  @IsOptional() @IsBoolean() notifications?: boolean;
  @IsOptional() @IsBoolean() pushEnabled?: boolean;
  @IsOptional() @IsBoolean() remind24Hours?: boolean;
  @IsOptional() @IsBoolean() remind48Hours?: boolean;
  @IsOptional() @IsBoolean() emailReminders?: boolean;
}
export class AssignmentsDto {
  @IsArray() @IsUUID('all', { each: true }) class_ids!: string[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvitationSubjectDto)
  subjects!: InvitationSubjectDto[];
}
