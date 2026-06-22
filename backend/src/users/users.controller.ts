import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { GetUser } from '@common/decorators/get-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '@common/decorators/roles.decorator';
import { RolesGuard } from '@common/decorators/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@ApiTags('Users')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Create a new user',
    description: 'Register a new user in the system',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'User has been successfully created.' })
  @ApiCreatedResponse({ type: CreateUserDto })
  @Post()
  @Roles('ADMIN')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the profile of the currently authenticated user',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiCreatedResponse({ type: UpdateUserDto })
  @Get('me')
  @ApiCreatedResponse({ description: 'User has been successfully created.' })
  async getProfile(@GetUser('userId') userId: string) {
    return this.usersService.getById(userId);
  }

  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update the profile of the currently authenticated user',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiCreatedResponse({ type: UpdateUserDto })
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @GetUser('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  // Rate limit to 3 requests per 15 minutes (ttl: 900000 ms).
  // A 15-minute window protects the server from database lockups/DoS during heavy cascade deletions
  // while offering a reasonable recovery window if users fail verification due to typos.
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @ApiOperation({
    summary: 'Delete current user account',
    description: 'Permanently deletes user profile, medical insights, predictions, chats, and uploads',
  })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async deleteAccount(@GetUser('userId') userId: string) {
    return this.usersService.deleteAccount(userId);
  }

  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a list of all users in the system',
  })
  @ApiCreatedResponse({ type: [UpdateUserDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('access-token')
  @Get('all')
  async getAllUsers(@GetUser('userId') userId: string) {
    return this.usersService.getAll(userId);
  }
}
