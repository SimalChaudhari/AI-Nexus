import { Injectable, NotFoundException } from '@nestjs/common';
import { LabelEntity } from './labels.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLabelDto, UpdateLabelDto } from './labels.dto';

@Injectable()
export class LabelService {
    constructor(
        @InjectRepository(LabelEntity)
        private labelRepository: Repository<LabelEntity>,
    ) { }

    async getAll(): Promise<LabelEntity[]> {
        return await this.labelRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async getById(id: string): Promise<LabelEntity> {
        const label = await this.labelRepository.findOne({ where: { id } });
        if (!label) {
            throw new NotFoundException("Label not found");
        }
        return label;
    }

    async create(createLabelDto: CreateLabelDto): Promise<{ message: string; label: LabelEntity }> {
        const label = this.labelRepository.create({
            title: createLabelDto.title,
        });

        await this.labelRepository.save(label);
        return {
            message: 'Label created successfully',
            label: label,
        };
    }

    async update(id: string, updateLabelDto: UpdateLabelDto): Promise<{ message: string; label: LabelEntity }> {
        const label = await this.labelRepository.findOne({ where: { id } });
        if (!label) {
            throw new NotFoundException('Label not found');
        }

        if (updateLabelDto.title !== undefined) {
            label.title = updateLabelDto.title;
        }

        await this.labelRepository.save(label);
        return {
            message: 'Label updated successfully',
            label: label,
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const label = await this.labelRepository.findOne({ where: { id } });
        if (!label) {
            throw new NotFoundException('Label not found');
        }

        await this.labelRepository.remove(label);
        return { message: 'Label deleted successfully' };
    }
}

