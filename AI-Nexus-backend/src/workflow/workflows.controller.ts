import {
    Controller,
    HttpStatus,
    Param,
    Get,
    Post,
    Delete,
    Put,
    Body,
    Res,
    Req,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '../user/users.entity';
import { Response } from 'express';
import { WorkflowService } from './workflows.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './workflows.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { extractAccessTokenFromRequest } from '../jwt/jwt-token.extractor';
import { LocalStorageService } from '../service/local-storage.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

const parseEnvPositiveNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const WORKFLOW_IMAGE_LIMIT_BYTES =
    parseEnvPositiveNumber(process.env.UPLOAD_IMAGE_MAX_MB, 50) * 1024 * 1024;

@ApiTags('Workflows')
@Controller('workflows')
export class WorkflowController {
    constructor(
        private readonly workflowService: WorkflowService,
        private readonly localStorageService: LocalStorageService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'List all workflows' })
    async getAllWorkflows(@Res() response: Response) {
        const workflows = await this.workflowService.getAll();
        return response.status(HttpStatus.OK).json({
            length: workflows.length,
            data: workflows,
        });
    }

    @Get('flowise-templates')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'List Flowise templates for logged-in user' })
    async getFlowiseTemplates(@Req() request: Request, @Res() response: Response) {
        const accessToken = extractAccessTokenFromRequest(request) || '';
        const templates = await this.workflowService.getFlowiseTemplates(accessToken);
        return response.status(HttpStatus.OK).json({
            length: templates.length,
            data: templates,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get workflow details by id' })
    async getWorkflowById(@Param('id') id: string, @Res() response: Response) {
        const workflow = await this.workflowService.getById(id);
        return response.status(HttpStatus.OK).json({
            data: workflow,
        });
    }

    @Post()
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a workflow with optional image upload' })
    @ApiBody({ type: CreateWorkflowDto })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: WORKFLOW_IMAGE_LIMIT_BYTES }, // 50MB limit
        })
    )
    async createWorkflow(
        @Body() createWorkflowDto: CreateWorkflowDto,
        @Res() response: Response,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: WORKFLOW_IMAGE_LIMIT_BYTES }), // 50MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            })
        )
        file?: Express.Multer.File,
    ) {
        // Upload image to local storage
        if (file) {
            const imageUrl = await this.localStorageService.saveFile(file, 'workflow');
            createWorkflowDto.image = imageUrl;
        }

        const result = await this.workflowService.create(createWorkflowDto);
        return response.status(HttpStatus.CREATED).json({
            message: result.message,
            workflow: result.workflow,
        });
    }

    @Put('update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update a workflow and optionally replace image' })
    @ApiBody({ type: UpdateWorkflowDto })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: WORKFLOW_IMAGE_LIMIT_BYTES }, // 50MB limit
        })
    )
    async updateWorkflow(
        @Param('id') id: string,
        @Body() updateWorkflowDto: UpdateWorkflowDto,
        @Res() response: Response,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: WORKFLOW_IMAGE_LIMIT_BYTES }), // 50MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            })
        )
        file?: Express.Multer.File,
    ) {
        // Get existing workflow to delete old image if new one is uploaded
        const existingWorkflow = await this.workflowService.getById(id);

        // Upload new image to local storage and delete old local one if replaced
        if (file) {
            await this.localStorageService.deleteFileByUrl(existingWorkflow.image);
            const imageUrl = await this.localStorageService.saveFile(file, 'workflow');
            updateWorkflowDto.image = imageUrl;
        }

        const result = await this.workflowService.update(id, updateWorkflowDto);
        return response.status(HttpStatus.OK).json({
            message: result.message,
            workflow: result.workflow,
        });
    }

    @Delete('delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a workflow' })
    async deleteWorkflow(@Param('id') id: string, @Res() response: Response) {
        // Get workflow before deleting to access image URL
        const workflow = await this.workflowService.getById(id);
        
        // Delete local image if it exists
        await this.localStorageService.deleteFileByUrl(workflow.image);

        const result = await this.workflowService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete(':id/image')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete only the workflow cover image' })
    async deleteWorkflowImage(@Param('id') id: string, @Res() response: Response) {
        const workflow = await this.workflowService.getById(id);

        // Delete image file from local storage if it exists
        await this.localStorageService.deleteFileByUrl(workflow.image);

        // Clear image field in DB
        const dto = new UpdateWorkflowDto();
        dto.image = '';
        const result = await this.workflowService.update(id, dto);

        return response.status(HttpStatus.OK).json({
            message: 'Workflow image deleted successfully',
            workflow: result.workflow,
        });
    }
}

