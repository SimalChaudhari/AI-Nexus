import { Injectable, NotFoundException } from '@nestjs/common';
import { SpeakerEntity } from './speaker.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateSpeakerDto, UpdateSpeakerDto } from './speaker.dto';

@Injectable()
export class SpeakerService {
  constructor(
    @InjectRepository(SpeakerEntity)
    private speakerRepository: Repository<SpeakerEntity>,
  ) {}

  async getAll(): Promise<SpeakerEntity[]> {
    return this.speakerRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /** For embedding on course payloads; preserves no duplicates, caller orders by course.speakerIds. */
  async findByIds(ids: string[]): Promise<SpeakerEntity[]> {
    const unique = [...new Set(ids.map((x) => String(x || '').trim()).filter(Boolean))];
    if (unique.length === 0) return [];
    return this.speakerRepository.find({
      where: { id: In(unique) },
    });
  }

  async getById(id: string): Promise<SpeakerEntity> {
    const speaker = await this.speakerRepository.findOne({
      where: { id },
    });
    if (!speaker) {
      throw new NotFoundException('Speaker not found');
    }
    return speaker;
  }

  async create(
    createSpeakerDto: CreateSpeakerDto,
  ): Promise<{ message: string; speaker: SpeakerEntity }> {
    const speaker = this.speakerRepository.create({
      name: createSpeakerDto.name,
      profileimage: createSpeakerDto.profileimage,
      about: createSpeakerDto.about,
    });
    await this.speakerRepository.save(speaker);
    return {
      message: 'Speaker created successfully',
      speaker,
    };
  }

  async update(
    id: string,
    updateSpeakerDto: UpdateSpeakerDto,
  ): Promise<{ message: string; speaker: SpeakerEntity }> {
    const speaker = await this.speakerRepository.findOne({
      where: { id },
    });
    if (!speaker) {
      throw new NotFoundException('Speaker not found');
    }
    if (updateSpeakerDto.name !== undefined) speaker.name = updateSpeakerDto.name;
    if (updateSpeakerDto.profileimage !== undefined)
      speaker.profileimage = updateSpeakerDto.profileimage;
    if (updateSpeakerDto.about !== undefined) speaker.about = updateSpeakerDto.about;
    await this.speakerRepository.save(speaker);
    return {
      message: 'Speaker updated successfully',
      speaker,
    };
  }

  async delete(id: string): Promise<{ message: string }> {
    const speaker = await this.speakerRepository.findOne({ where: { id } });
    if (!speaker) {
      throw new NotFoundException('Speaker not found');
    }
    await this.speakerRepository.remove(speaker);
    return { message: 'Speaker deleted successfully' };
  }
}
