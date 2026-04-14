import React from 'react';
import { Mail, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ProjectDetail } from '@/lib/types';

export function Members({ detail }: { detail: ProjectDetail }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-display font-bold">Members</h3>
        <p className="text-muted-foreground">People who can access this project.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {detail.members.map((m) => (
          <Card key={m.id} className="border-muted/60 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 border-2 border-primary/10">
                  <AvatarImage src={m.avatar} />
                  <AvatarFallback>{(m.name || 'U').charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="text-lg truncate">{m.name}</CardTitle>
                  <CardDescription className="truncate">{m.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant="outline" className="capitalize">
                {m.role}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail size={14} /> Contact
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!detail.members.length && (
        <div className="p-8 text-center text-muted-foreground">
          <Users className="mx-auto mb-3" />
          No members.
        </div>
      )}
    </div>
  );
}

