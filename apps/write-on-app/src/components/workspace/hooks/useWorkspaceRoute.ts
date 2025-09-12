/**
 * Step 10: Hook for determining workspace route context
 * 
 * Provides:
 * - Route-based readonly mode (student routes)
 * - Route-based initial scene (teacher routes)
 * - URL pattern detection
 */

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface WorkspaceRouteContext {
  /** Is this a readonly route (student mode) */
  isReadonly: boolean;
  /** Is this a teacher route (can edit and set scenes) */
  isTeacher: boolean;
  /** Initial scene data from URL or route context */
  initialScene: unknown | null;
  /** Route type identifier */
  routeType: 'student' | 'teacher' | 'public' | 'dev';
  /** Current workspace/lesson ID if applicable */
  workspaceId: string | null;
}

export function useWorkspaceRoute(): WorkspaceRouteContext {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [context, setContext] = useState<WorkspaceRouteContext>({
    isReadonly: false,
    isTeacher: false,
    initialScene: null,
    routeType: 'dev',
    workspaceId: null,
  });

  useEffect(() => {
    const updateContext = () => {
      // Step 10: Route pattern detection
      // For now, using simple patterns - can be expanded for real routing
      
      let routeType: WorkspaceRouteContext['routeType'] = 'dev';
      let isReadonly = false;
      let isTeacher = false;
      let initialScene: unknown | null = null;
      let workspaceId: string | null = null;

      // URL parameter parsing
      const sceneParam = searchParams.get('scene');
      const modeParam = searchParams.get('mode');
      const workspaceParam = searchParams.get('workspace');

      // Extract workspace ID from URL if present
      if (workspaceParam) {
        workspaceId = workspaceParam;
      }

      // Parse initial scene from URL
      if (sceneParam) {
        try {
          initialScene = JSON.parse(decodeURIComponent(sceneParam));
        } catch (error) {
          console.warn('[useWorkspaceRoute] Invalid scene parameter:', error);
        }
      }

      // Route type detection based on pathname patterns
      if (pathname.includes('/student/')) {
        routeType = 'student';
        isReadonly = true;
        isTeacher = false;
      } else if (pathname.includes('/teacher/')) {
        routeType = 'teacher';
        isReadonly = false;
        isTeacher = true;
      } else if (pathname.includes('/public/')) {
        routeType = 'public';
        isReadonly = true;
        isTeacher = false;
      } else {
        // Default dev mode - can edit, no initial constraints
        routeType = 'dev';
        isReadonly = false;
        isTeacher = true; // Dev has teacher-like permissions
      }

      // Mode parameter override
      if (modeParam === 'readonly' || modeParam === 'student') {
        isReadonly = true;
        isTeacher = false;
      } else if (modeParam === 'edit' || modeParam === 'teacher') {
        isReadonly = false;
        isTeacher = true;
      }

      setContext({
        isReadonly,
        isTeacher,
        initialScene,
        routeType,
        workspaceId,
      });

      console.log('[useWorkspaceRoute] Route context updated:', {
        pathname,
        routeType,
        isReadonly,
        isTeacher,
        workspaceId,
        hasInitialScene: !!initialScene
      });
    };

    updateContext();
  }, [pathname, searchParams]);

  return context;
}

// Utility functions for route-based logic
export function getWorkspaceUrl(workspaceId: string, mode: 'student' | 'teacher' = 'teacher'): string {
  return `/?workspace=${encodeURIComponent(workspaceId)}&mode=${mode}`;
}

export function getSceneUrl(scene: unknown, mode: 'student' | 'teacher' = 'student'): string {
  const sceneParam = encodeURIComponent(JSON.stringify(scene));
  return `/?scene=${sceneParam}&mode=${mode}`;
}

export function getPublicWorkspaceUrl(workspaceId: string): string {
  return `/public/${encodeURIComponent(workspaceId)}`;
}

export type { WorkspaceRouteContext };