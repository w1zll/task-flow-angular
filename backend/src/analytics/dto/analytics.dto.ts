import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AnalyticsQueryDto {
  @ApiProperty({ required: false, example: 'board-uuid' })
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @ApiProperty({ required: false, example: 'team-uuid' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiProperty({ required: false, example: 'user-uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({ required: false, example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ required: false, example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class AnalyticsCountBucketDto {
  @ApiProperty({ required: false, nullable: true, example: 'team-uuid' })
  id: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Design' })
  name: string | null;

  @ApiProperty({ example: 12 })
  count: number;
}

export class AnalyticsWorkloadBucketDto {
  @ApiProperty({ required: false, nullable: true, example: 'user-uuid' })
  id: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Jane Doe' })
  name: string | null;

  @ApiProperty({ example: 8 })
  openCount: number;

  @ApiProperty({ example: 2 })
  overdueCount: number;

  @ApiProperty({ example: 720 })
  estimateMinutes: number;

  @ApiProperty({ example: 21 })
  storyPoints: number;
}

export class AnalyticsWeekPointDto {
  @ApiProperty({ example: '2026-06-01' })
  weekStart: string;

  @ApiProperty({ example: 8 })
  count: number;
}

export class AnalyticsTotalsDto {
  @ApiProperty({ example: 24 })
  completed: number;

  @ApiProperty({ example: 18 })
  open: number;

  @ApiProperty({ example: 5 })
  overdue: number;

  @ApiProperty({ example: 42 })
  total: number;
}

export class AnalyticsOverdueDto {
  @ApiProperty({ example: 5 })
  count: number;

  @ApiProperty({ type: () => AnalyticsOverdueTaskDto, isArray: true })
  topTasks: AnalyticsOverdueTaskDto[];
}

export class AnalyticsOverdueTaskDto {
  @ApiProperty({ example: 'task-uuid' })
  id: string;

  @ApiProperty({ example: 'Fix onboarding crash' })
  title: string;

  @ApiProperty({ example: 'board-uuid' })
  boardId: string;

  @ApiProperty({ required: false, nullable: true, example: 'Product launch' })
  boardTitle: string | null;

  @ApiProperty({ example: '2026-06-12T00:00:00.000Z' })
  dueDate: string;

  @ApiProperty({ required: false, nullable: true, example: 'user-uuid' })
  assigneeId: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Jane Doe' })
  assigneeName: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'team-uuid' })
  teamId: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Design' })
  teamName: string | null;
}

export class AnalyticsCycleTimeDto {
  @ApiProperty({ required: false, nullable: true, example: 4.25 })
  averageDays: number | null;

  @ApiProperty({ example: 24 })
  sampleCount: number;
}

export class AnalyticsCompletionOnTimeDto {
  @ApiProperty({ example: 24 })
  total: number;

  @ApiProperty({ example: 18 })
  onTime: number;

  @ApiProperty({ example: 6 })
  late: number;

  @ApiProperty({ required: false, nullable: true, example: 0.75 })
  onTimeRatio: number | null;
}

export class AnalyticsBurndownPointDto {
  @ApiProperty({ example: '2026-06-01' })
  weekStart: string;

  @ApiProperty({ example: 32 })
  count: number;
}

export class AnalyticsBurndownDto {
  @ApiProperty({ example: 'board-uuid' })
  boardId: string;

  @ApiProperty({ example: true })
  hasStoryPoints: boolean;

  @ApiProperty({ type: () => AnalyticsBurndownPointDto, isArray: true })
  remainingTasks: AnalyticsBurndownPointDto[];

  @ApiProperty({ type: () => AnalyticsBurndownPointDto, isArray: true })
  remainingStoryPoints: AnalyticsBurndownPointDto[];

  @ApiProperty({ required: false, nullable: true })
  message?: string | null;
}

export class AnalyticsDashboardResponseDto {
  @ApiProperty({ type: () => AnalyticsTotalsDto })
  totals: AnalyticsTotalsDto;

  @ApiProperty({ type: () => AnalyticsCountBucketDto, isArray: true })
  completedByTeam: AnalyticsCountBucketDto[];

  @ApiProperty({ type: () => AnalyticsOverdueDto })
  overdue: AnalyticsOverdueDto;

  @ApiProperty({ type: () => AnalyticsWorkloadBucketDto, isArray: true })
  workloadByAssignee: AnalyticsWorkloadBucketDto[];

  @ApiProperty({ type: () => AnalyticsCycleTimeDto })
  cycleTime: AnalyticsCycleTimeDto;

  @ApiProperty({ type: () => AnalyticsWeekPointDto, isArray: true })
  throughputByWeek: AnalyticsWeekPointDto[];

  @ApiProperty({ type: () => AnalyticsBurndownDto, required: false, nullable: true })
  burndown: AnalyticsBurndownDto | null;

  @ApiProperty({ type: () => AnalyticsCompletionOnTimeDto })
  completionOnTime: AnalyticsCompletionOnTimeDto;
}
