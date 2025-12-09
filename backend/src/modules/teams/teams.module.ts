import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { MembersService } from './members.service';
import { InvitationsService } from './invitations.service';
import { GitConnectionsService } from './git-connections.service';
import { GitLabProvider } from './git-providers/gitlab.provider';
import { BitbucketProvider } from './git-providers/bitbucket.provider';

@Module({
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
