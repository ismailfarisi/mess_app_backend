import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum PhotoType {
  PROFILE = 'profile',
  COVER = 'cover',
}

export class UploadPhotoDto {
  @ApiProperty({
    enum: PhotoType,
    description: 'Type of photo to upload (profile or cover)',
  })
  @IsEnum(PhotoType)
  @IsNotEmpty()
  photoType: PhotoType;
}

export class PhotoUploadResponseDto {
  @ApiProperty({ description: 'URL of the uploaded photo' })
  photoUrl: string;

  @ApiProperty({ description: 'Type of photo uploaded' })
  photoType: PhotoType;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
