import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type HomeHeroContent = {
  headline?: string;
  description?: string;
  cta?: {
    label?: string;
    href?: string;
    /** Hex color for button background, e.g. #d4f938 */
    buttonColor?: string;
    /** Hex color for button label */
    buttonTextColor?: string;
    /** Horizontal placement of the CTA row */
    align?: 'left' | 'center' | 'right' | '';
  };
  event?: {
    startDateLabel?: string;
    startDate?: string;
    startTimeLabel?: string;
    startTime?: string;
  };
  stats?: Array<{ value?: string; label?: string; icon?: string }>;
};

@Entity('app_settings')
export class AppSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  logoUrl?: string | null;

  /** Public home page hero section background (uploaded asset path or null = use built-in default). */
  @Column({ type: 'varchar', nullable: true })
  homeHeroImageUrl?: string | null;

  /** Public home hero text/cta/stats content managed from admin panel. */
  @Column({ type: 'jsonb', nullable: true })
  homeHeroContent?: HomeHeroContent | null;

  /** Persona -> recommended course IDs mapping, configurable by admin. */
  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'::jsonb" })
  personaCourseMappings?: Array<{ persona: string; courseIds: string[] }> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
