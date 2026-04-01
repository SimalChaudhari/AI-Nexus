import { Injectable, NotFoundException } from '@nestjs/common';
import { LanguageEntity } from './language.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLanguageDto, UpdateLanguageDto } from './language.dto';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(LanguageEntity)
    private languageRepository: Repository<LanguageEntity>,
  ) {}

  async getAll(): Promise<LanguageEntity[]> {
    return this.languageRepository.find({
      where: { deleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllForAdmin(): Promise<LanguageEntity[]> {
    return this.languageRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getById(id: string): Promise<LanguageEntity> {
    const language = await this.languageRepository.findOne({
      where: { id, deleted: false },
    });
    if (!language) {
      throw new NotFoundException('Language not found');
    }
    return language;
  }

  async getByIdForAdmin(id: string): Promise<LanguageEntity> {
    const language = await this.languageRepository.findOne({
      where: { id },
    });
    if (!language) {
      throw new NotFoundException('Language not found');
    }
    return language;
  }

  async create(
    createLanguageDto: CreateLanguageDto,
  ): Promise<{ message: string; language: LanguageEntity }> {
    const language = this.languageRepository.create({
      title: createLanguageDto.title,
      deleted: createLanguageDto.deleted ?? false,
    });
    await this.languageRepository.save(language);
    return {
      message: 'Language created successfully',
      language,
    };
  }

  async update(
    id: string,
    updateLanguageDto: UpdateLanguageDto,
  ): Promise<{ message: string; language: LanguageEntity }> {
    const language = await this.languageRepository.findOne({
      where: { id },
    });
    if (!language) {
      throw new NotFoundException('Language not found');
    }
    if (updateLanguageDto.title !== undefined) {
      language.title = updateLanguageDto.title;
    }
    if (updateLanguageDto.deleted !== undefined) {
      language.deleted = updateLanguageDto.deleted;
    }
    await this.languageRepository.save(language);
    return {
      message: 'Language updated successfully',
      language,
    };
  }

  async delete(id: string): Promise<{ message: string }> {
    const language = await this.languageRepository.findOne({
      where: { id, deleted: false },
    });
    if (!language) {
      throw new NotFoundException('Language not found');
    }
    language.deleted = true;
    await this.languageRepository.save(language);
    return { message: 'Language deleted successfully' };
  }
}
