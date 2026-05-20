import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatbotMessageDto } from './chatbot.dto';
import { ChatbotService } from './chatbot.service';

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
    constructor(private readonly chatbotService: ChatbotService) {}

    @Get('status')
    @ApiOperation({ summary: 'Show active AI provider configuration (no secrets)' })
    getStatus(@Res() response: Response) {
        return response.status(HttpStatus.OK).json({
            message: 'Chatbot AI status',
            data: this.chatbotService.getStatus(),
        });
    }

    @Post('message')
    @ApiOperation({ summary: 'Send a chatbot message and receive reply' })
    @ApiBody({ type: ChatbotMessageDto })
    async sendMessage(
        @Body() dto: ChatbotMessageDto,
        @Res() response: Response,
    ) {
        const result = await this.chatbotService.sendMessage(dto);
        return response.status(HttpStatus.OK).json({
            message: 'Chatbot reply generated',
            data: result,
        });
    }
}

