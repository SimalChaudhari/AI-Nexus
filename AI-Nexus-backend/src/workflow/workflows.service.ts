import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorkflowEntity } from './workflows.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateWorkflowDto, UpdateWorkflowDto } from './workflows.dto';
import { LabelEntity } from '../label/labels.entity';
import { TagEntity } from '../tag/tags.entity';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import axios from 'axios';
import * as https from 'https';

@Injectable()
export class WorkflowService {
    constructor(
        @InjectRepository(WorkflowEntity)
        private workflowRepository: Repository<WorkflowEntity>,
        @InjectRepository(LabelEntity)
        private labelRepository: Repository<LabelEntity>,
        @InjectRepository(TagEntity)
        private tagRepository: Repository<TagEntity>,
    ) { }

    private normalizeFlowData(flowData: unknown): { nodes?: any[]; edges?: any[] } | undefined {
        if (!flowData) return undefined;

        let parsed: any = flowData;
        if (typeof flowData === 'string') {
            try {
                parsed = JSON.parse(flowData);
            } catch {
                return undefined;
            }
        }

        if (!parsed || typeof parsed !== 'object') return undefined;

        const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
        const edges = Array.isArray(parsed.edges) ? parsed.edges : [];
        return { nodes, edges };
    }

    async getAll(): Promise<WorkflowEntity[]> {
        return await this.workflowRepository.find({
            relations: ['label', 'tags'],
            order: { createdAt: 'DESC' }
        });
    }

    async getById(id: string): Promise<WorkflowEntity> {
        const workflow = await this.workflowRepository.findOne({
            where: { id },
            relations: ['label', 'tags']
        });
        if (!workflow) {
            throw new NotFoundException("Workflow not found");
        }
        return workflow;
    }

    async create(createWorkflowDto: CreateWorkflowDto): Promise<{ message: string; workflow: WorkflowEntity }> {
        const workflowData: Partial<WorkflowEntity> = {
            title: createWorkflowDto.title,
            description: createWorkflowDto.description || undefined,
            image: createWorkflowDto.image || undefined,
            flowData: this.normalizeFlowData(createWorkflowDto.flowData),
        };

        const workflow = this.workflowRepository.create(workflowData);

        // Handle label relationship if labelId provided
        if (createWorkflowDto.labelId) {
            const label = await this.labelRepository.findOne({
                where: { id: createWorkflowDto.labelId }
            });
            if (label) {
                workflow.label = label;
                workflow.labelId = label.id;
            }
        }

        // Process tags: create new ones and get existing ones
        const allTagIds: string[] = [];

        // Get existing tags by IDs
        if (createWorkflowDto.tagIds && createWorkflowDto.tagIds.length > 0) {
            const existingTags = await this.tagRepository.find({
                where: { id: In(createWorkflowDto.tagIds) }
            });
            if (existingTags.length !== createWorkflowDto.tagIds.length) {
                throw new NotFoundException('One or more tags not found');
            }
            allTagIds.push(...existingTags.map(tag => tag.id));
        }

        // Create new tags from titles
        if (createWorkflowDto.tagTitles && createWorkflowDto.tagTitles.length > 0) {
            for (const tagTitle of createWorkflowDto.tagTitles) {
                if (!tagTitle || !tagTitle.trim()) continue;

                // Check if tag already exists by title
                let tag = await this.tagRepository.findOne({
                    where: { title: tagTitle.trim() }
                });

                // If tag doesn't exist, create it
                if (!tag) {
                    tag = this.tagRepository.create({ title: tagTitle.trim() });
                    tag = await this.tagRepository.save(tag);
                }

                // Add tag ID if not already in the list
                if (!allTagIds.includes(tag.id)) {
                    allTagIds.push(tag.id);
                }
            }
        }

        // Set all tags (existing + newly created)
        if (allTagIds.length > 0) {
            const tags = await this.tagRepository.find({
                where: { id: In(allTagIds) }
            });
            workflow.tags = tags;
        }

        await this.workflowRepository.save(workflow);
        return {
            message: 'Workflow created successfully',
            workflow: await this.getById(workflow.id),
        };
    }

    async update(id: string, updateWorkflowDto: UpdateWorkflowDto): Promise<{ message: string; workflow: WorkflowEntity }> {
        const workflow = await this.workflowRepository.findOne({
            where: { id },
            relations: ['label', 'tags']
        });
        if (!workflow) {
            throw new NotFoundException('Workflow not found');
        }

        // Delete old file if new one is being uploaded
        if (updateWorkflowDto.image !== undefined && updateWorkflowDto.image && workflow.image) {
            // Only delete if it's a file path (not base64 or full URL)
            if (!workflow.image.startsWith('data:') && !workflow.image.startsWith('http')) {
                const oldFilePath = join(process.cwd(), workflow.image);
                if (existsSync(oldFilePath)) {
                    try {
                        await unlink(oldFilePath);
                    } catch (error) {
                        console.error('Error deleting old workflow image:', error);
                    }
                }
            }
        }

        // Update fields if provided
        if (updateWorkflowDto.title !== undefined) {
            workflow.title = updateWorkflowDto.title;
        }
        if (updateWorkflowDto.description !== undefined) {
            workflow.description = updateWorkflowDto.description;
        }
        if (updateWorkflowDto.image !== undefined) {
            // Empty string means clear the image, otherwise set the new image URL
            workflow.image = updateWorkflowDto.image === '' ? null : updateWorkflowDto.image;
        }
        if (updateWorkflowDto.flowData !== undefined) {
            workflow.flowData = this.normalizeFlowData(updateWorkflowDto.flowData);
        }

        // Update label relationship if labelId provided
        if (updateWorkflowDto.labelId !== undefined) {
            if (updateWorkflowDto.labelId) {
                const label = await this.labelRepository.findOne({
                    where: { id: updateWorkflowDto.labelId }
                });
                if (label) {
                    workflow.label = label;
                    workflow.labelId = label.id;
                }
            } else {
                // Remove label if labelId is empty string or null
                workflow.label = undefined;
                workflow.labelId = undefined;
            }
        }

        // Process tags: create new ones and get existing ones
        if (updateWorkflowDto.tagIds !== undefined || updateWorkflowDto.tagTitles !== undefined) {
            const allTagIds: string[] = [];

            // Get existing tags by IDs
            if (updateWorkflowDto.tagIds && updateWorkflowDto.tagIds.length > 0) {
                const existingTags = await this.tagRepository.find({
                    where: { id: In(updateWorkflowDto.tagIds) }
                });
                if (existingTags.length !== updateWorkflowDto.tagIds.length) {
                    throw new NotFoundException('One or more tags not found');
                }
                allTagIds.push(...existingTags.map(tag => tag.id));
            }

            // Create new tags from titles
            if (updateWorkflowDto.tagTitles && updateWorkflowDto.tagTitles.length > 0) {
                for (const tagTitle of updateWorkflowDto.tagTitles) {
                    if (!tagTitle || !tagTitle.trim()) continue;

                    // Check if tag already exists by title
                    let tag = await this.tagRepository.findOne({
                        where: { title: tagTitle.trim() }
                    });

                    // If tag doesn't exist, create it
                    if (!tag) {
                        tag = this.tagRepository.create({ title: tagTitle.trim() });
                        tag = await this.tagRepository.save(tag);
                    }

                    // Add tag ID if not already in the list
                    if (!allTagIds.includes(tag.id)) {
                        allTagIds.push(tag.id);
                    }
                }
            }

            // Set all tags (existing + newly created)
            if (allTagIds.length > 0) {
                const tags = await this.tagRepository.find({
                    where: { id: In(allTagIds) }
                });
                workflow.tags = tags;
            } else {
                workflow.tags = [];
            }
        }

        await this.workflowRepository.save(workflow);
        return {
            message: 'Workflow updated successfully',
            workflow: await this.getById(id),
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const workflow = await this.workflowRepository.findOne({ where: { id } });
        if (!workflow) {
            throw new NotFoundException('Workflow not found');
        }

        // Delete associated image file
        if (workflow.image) {
            // Only delete if it's a file path (not base64 or full URL)
            if (!workflow.image.startsWith('data:') && !workflow.image.startsWith('http')) {
                const imagePath = join(process.cwd(), workflow.image);
                if (existsSync(imagePath)) {
                    try {
                        await unlink(imagePath);
                    } catch (error) {
                        console.error('Error deleting workflow image:', error);
                    }
                }
            }
        }

        await this.workflowRepository.remove(workflow);
        return { message: 'Workflow deleted successfully' };
    }

    private parseFlowiseAnalytic(analytic: unknown): Record<string, any> {
        if (typeof analytic === 'string' && analytic.trim()) {
            try {
                const parsed = JSON.parse(analytic);
                return parsed && typeof parsed === 'object' ? parsed : {};
            } catch {
                return {};
            }
        }
        if (analytic && typeof analytic === 'object') {
            return analytic as Record<string, any>;
        }
        return {};
    }

    private getFlowiseTemplateVisibility(row: any): 'public' | 'private' {
        const visibility = String(this.parseFlowiseAnalytic(row?.analytic)?.aiNexusTemplateVisibility || 'public')
            .trim()
            .toLowerCase();
        return visibility === 'private' ? 'private' : 'public';
    }

    private getFlowiseTemplateCreatorId(row: any): string {
        return String(this.parseFlowiseAnalytic(row?.analytic)?.aiNexusCreator?.id || '').trim();
    }

    private canViewFlowiseTemplate(row: any, currentUserId: string): boolean {
        const templateSource = String(row?.templateSource || '');
        // Community marketplace templates are always listed.
        if (templateSource === 'community_template') return true;
        // User's saved Flowise "My Templates" should always appear for signed-in users who can fetch them.
        if (templateSource === 'my_template') return true;

        const visibility = this.getFlowiseTemplateVisibility(row);
        if (visibility === 'public') return true;

        const creatorId = this.getFlowiseTemplateCreatorId(row);
        if (!creatorId || !currentUserId) return false;
        return creatorId === currentUserId;
    }

    private buildFlowiseClient() {
        const backendHost = (process.env.APP_HOST || 'localhost').trim();
        const flowisePort = (process.env.FLOWISE_PORT || '3002').trim();
        const envBases = [
            process.env.FLOWISE_INTERNAL_URL,
            process.env.FLOWISE_API_URL,
            process.env.FLOWISE_URL,
            process.env.VITE_FLOWISE_URL,
        ]
            .map((value) => (value || '').trim().replace(/\/$/, ''))
            .filter(Boolean);
        const fallbackBases = [
            `http://${backendHost}:${flowisePort}`,
            `http://localhost:${flowisePort}`,
            `https://${backendHost}:${flowisePort}`,
            `http://${backendHost}:3000`,
            'http://localhost:3002',
            'http://localhost:3000',
            'http://localhost:3001',
        ];
        const flowiseBases = [...new Set([...envBases, ...fallbackBases])];

        const flowiseTimeoutMs = Number(process.env.FLOWISE_REQUEST_TIMEOUT_MS || 8000);
        const safeTimeoutMs = Number.isFinite(flowiseTimeoutMs) && flowiseTimeoutMs > 0 ? flowiseTimeoutMs : 8000;
        const tlsRejectUnauthorized = !['0', 'false', 'no'].includes(
            String(process.env.FLOWISE_TLS_REJECT_UNAUTHORIZED || 'true').trim().toLowerCase(),
        );

        const client = axios.create({
            timeout: safeTimeoutMs,
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 500,
            httpsAgent: new https.Agent({ rejectUnauthorized: tlsRejectUnauthorized }),
        });

        return { client, flowiseBases };
    }

    private async establishFlowiseSession(accessToken: string): Promise<{
        client: ReturnType<typeof axios.create>;
        activeFlowiseBase: string;
        requestConfig: {
            headers: { Cookie: string; 'x-request-from': string };
            params: { page: number; limit: number };
            validateStatus: (status: number) => boolean;
        };
    } | null> {
        if (!accessToken) return null;

        const { client, flowiseBases } = this.buildFlowiseClient();
        let loginResponse: { headers: Record<string, any> } | null = null;
        let activeFlowiseBase = '';
        const connectionErrors: string[] = [];

        for (const base of flowiseBases) {
            try {
                const candidateLoginResponse = await client.get(`${base}/api/v1/auth/external-login`, {
                    params: { token: accessToken },
                    validateStatus: (status) => status >= 200 && status < 400,
                });
                const setCookieHeader = candidateLoginResponse.headers?.['set-cookie'] as string[] | undefined;
                if (Array.isArray(setCookieHeader) && setCookieHeader.length > 0) {
                    loginResponse = candidateLoginResponse;
                    activeFlowiseBase = base;
                    break;
                }
            } catch {
                connectionErrors.push(base);
            }
        }

        if (!loginResponse || !activeFlowiseBase) {
            if (connectionErrors.length) {
                console.warn(
                    `[WorkflowService] Flowise template bridge failed for all candidates: ${connectionErrors.join(', ')}`,
                );
            }
            return null;
        }

        const setCookieHeader = loginResponse.headers['set-cookie'] as string[] | undefined;
        const cookieHeader = Array.isArray(setCookieHeader)
            ? setCookieHeader.map((cookie: string) => cookie.split(';')[0]).join('; ')
            : '';

        if (!cookieHeader) return null;

        return {
            client,
            activeFlowiseBase,
            requestConfig: {
                headers: {
                    Cookie: cookieHeader,
                    'x-request-from': 'internal',
                },
                params: { page: 1, limit: 200 },
                validateStatus: (status: number) => status >= 200 && status < 500,
            },
        };
    }

    async getFlowiseTemplates(accessToken: string, currentUserId = ''): Promise<any[]> {
        const session = await this.establishFlowiseSession(accessToken);
        if (!session) return [];

        const { client, activeFlowiseBase, requestConfig } = session;

        const [agentflowsRes, chatflowsRes, communityTemplatesRes, myTemplatesRes] = await Promise.all([
            client.get(`${activeFlowiseBase}/api/v1/chatflows`, { ...requestConfig, params: { ...requestConfig.params, type: 'AGENTFLOW' } }),
            client.get(`${activeFlowiseBase}/api/v1/chatflows`, { ...requestConfig, params: { ...requestConfig.params, type: 'CHATFLOW' } }),
            client.get(`${activeFlowiseBase}/api/v1/marketplaces/templates`, requestConfig),
            client.get(`${activeFlowiseBase}/api/v1/marketplaces/custom`, requestConfig),
        ]);

        const readRows = (payload: any) => {
            if (!payload) return [];
            if (Array.isArray(payload?.data)) return payload.data;
            if (Array.isArray(payload)) return payload;
            return [];
        };

        const taggedRows = [
            ...readRows(agentflowsRes.data).map((row: any) => ({ ...row, templateSource: 'workspace_flow' })),
            ...readRows(chatflowsRes.data).map((row: any) => ({ ...row, templateSource: 'workspace_flow' })),
            ...readRows(communityTemplatesRes.data).map((row: any) => ({ ...row, templateSource: 'community_template' })),
            ...readRows(myTemplatesRes.data).map((row: any) => ({ ...row, templateSource: 'my_template' })),
        ];

        const byId = new Map<string, any>();
        taggedRows.forEach((row) => {
            const stableId = row?.id || `${row?.templateSource}:${row?.type || 'template'}:${row?.templateName || row?.name || ''}`;
            if (stableId) byId.set(String(stableId), { ...row, id: stableId });
        });

        return [...byId.values()].filter((row) => this.canViewFlowiseTemplate(row, currentUserId));
    }

    async updateFlowiseTemplateVisibility(
        accessToken: string,
        currentUserId: string,
        flowiseId: string,
        visibility: 'public' | 'private',
    ): Promise<{ message: string; visibility: 'public' | 'private' }> {
        if (!currentUserId) {
            throw new ForbiddenException('You must be signed in to update template visibility');
        }

        const normalizedFlowiseId = String(flowiseId || '').trim();
        if (!normalizedFlowiseId) {
            throw new NotFoundException('Flowise template not found');
        }

        const session = await this.establishFlowiseSession(accessToken);
        if (!session) {
            throw new NotFoundException('Unable to connect to Flowise');
        }

        const { client, activeFlowiseBase, requestConfig } = session;
        const chatflowRes = await client.get(`${activeFlowiseBase}/api/v1/chatflows/${normalizedFlowiseId}`, requestConfig);
        const chatflow = chatflowRes.data;
        if (!chatflow?.id) {
            throw new NotFoundException('Flowise template not found');
        }

        const creatorId = this.getFlowiseTemplateCreatorId(chatflow);
        if (creatorId && creatorId !== currentUserId) {
            throw new ForbiddenException('Only the template creator can change visibility');
        }

        const analytic = this.parseFlowiseAnalytic(chatflow.analytic);
        analytic.aiNexusTemplateVisibility = visibility;

        await client.put(
            `${activeFlowiseBase}/api/v1/chatflows/${normalizedFlowiseId}`,
            { analytic: JSON.stringify(analytic) },
            requestConfig,
        );

        return {
            message: `Template is now ${visibility}`,
            visibility,
        };
    }
}

