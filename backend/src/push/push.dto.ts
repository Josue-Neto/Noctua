import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
class KeysDto {
  @IsString() @MaxLength(200) p256dh!: string;
  @IsString() @MaxLength(100) auth!: string;
}
export class SubscribeDto {
  @IsString() @MaxLength(2048) endpoint!: string;
  @IsOptional() @IsNumber() expirationTime?: number | null;
  @ValidateNested() @Type(() => KeysDto) keys!: KeysDto;
}
export class UnsubscribeDto {
  @IsString() @MaxLength(2048) endpoint!: string;
}
