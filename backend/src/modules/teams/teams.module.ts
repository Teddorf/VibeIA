import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { MembersService } from './members.service';
import { InvitationsService } from './invitations.service';
import { GitConnectionsService } from './git-connections.service';
import { GitLabProvider } from './git-providers/gitlab.provider';
import { BitbucketProvider } from './git-providers/bitbucket.provider';
import { Team, TeamSchema } from './schemas/team.schema';
import { TeamMember, TeamMemberSchema } from './schemas/team-member.schema';
import { TeamInvitation, TeamInvitationSchema } from './schemas/team-invitation.schema';
import { GitConnection, GitConnectionSchema } from './schemas/git-connection.schema';
import { TeamActivity, TeamActivitySchema } from './schemas/team-activity.schema';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Team.name, schema: TeamSchema },
      { name: TeamMember.name, schema: TeamMemberSchema },
      { name: TeamInvitation.name, schema: TeamInvitationSchema },
      { name: GitConnection.name, schema: GitConnectionSchema },
      { name: TeamActivity.name, schema: TeamActivitySchema },
    ]),
    SecurityModule,
  ],
  controllers: [TeamsController],
  providers: [
    TeamsService,
    MembersService,
    InvitationsService,
    GitConnectionsService,
    GitLabProvider,
    BitbucketProvider,
  ],
  exports: [
    TeamsService,
    MembersService,
    InvitationsService,
    GitConnectionsService,
    GitLabProvider,
    BitbucketProvider,
  ],
})
export class TeamsModule {}
