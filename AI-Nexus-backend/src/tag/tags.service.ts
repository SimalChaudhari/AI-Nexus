import { Injectable, NotFoundException } from '@nestjs/common';
import { TagEntity } from './tags.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTagDto, UpdateTagDto } from './tags.dto';

@Injectable()
export class TagService {
    constructor(
        @InjectRepository(TagEntity)
        private tagRepository: Repository<TagEntity>,
    ) { }

    async getAll(): Promise<TagEntity[]> {
        return await this.tagRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async getById(id: string): Promise<TagEntity> {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) {
            throw new NotFoundException("Tag not found");
        }
        return tag;
    }

    async create(createTagDto: CreateTagDto): Promise<{ message: string; tag: TagEntity }> {
        const tag = this.tagRepository.create({
            title: createTagDto.title,
        });

        await this.tagRepository.save(tag);
        return {
            message: 'Tag created successfully',
            tag: tag,
        };
    }

    async update(id: string, updateTagDto: UpdateTagDto): Promise<{ message: string; tag: TagEntity }> {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) {
            throw new NotFoundException('Tag not found');
        }

        if (updateTagDto.title !== undefined) {
            tag.title = updateTagDto.title;
        }

        await this.tagRepository.save(tag);
        return {
            message: 'Tag updated successfully',
            tag: tag,
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) {
            throw new NotFoundException('Tag not found');
        }

        await this.tagRepository.remove(tag);
        return { message: 'Tag deleted successfully' };
    }
}

