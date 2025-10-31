/**
 * Step 10: Hook for determining workspace route context
 * 
 * Provides:
 * - Route-based readonly mode (student routes)
 * - Route-based initial scene (teacher routes)
 * - URL pattern detection
 */

"use client";

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AssignmentSceneLoader, MockAssignmentStorageService } from '@/components/workspace/types/assignmentStorage';
import type { LoadSceneResponse } from '@/components/workspace/types/assignmentStorage';

interface WorkspaceRouteContext {
  /** View mode: who is viewing the canvas */
  mode: 'teacher' | 'student';
  /** Write scope: which layer is writable */
  writeScope: 'teacher-base' | 'student' | 'teacher-review';
  /** Teacher base layer scene data from assignment storage */
  baseScene: unknown | null;
  /** Student/review overlay scene data from assignment storage */
  overlayScene: unknown | null;
  /** Route type identifier */
  routeType: 'student' | 'teacher' | 'public' | 'dev';
  /** Current workspace/lesson ID if applicable */
  workspaceId: string | null;
  /** Assignment context */
  assignmentId: string | null;
  /** Current user ID */
  userId: string | null;
  /** Target student ID (for teacher review mode) */
  targetStudentId: string | null;
  /** Loading state for assignment data */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** @deprecated - use mode and writeScope instead */
  isReadonly: boolean;
  /** @deprecated - use mode instead */
  isTeacher: boolean;
  /** @deprecated - use baseScene instead */
  initialScene: unknown | null;
}

export function useWorkspaceRoute(): WorkspaceRouteContext {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [context, setContext] = useState<WorkspaceRouteContext>({
    mode: 'teacher',
    writeScope: 'teacher-base',
    baseScene: null,
    overlayScene: null,
    routeType: 'dev',
    workspaceId: null,
    assignmentId: null,
    userId: null,
    targetStudentId: null,
    isLoading: false,
    error: null,
    // Deprecated fields for backward compatibility
    isReadonly: false,
    isTeacher: true,
    initialScene: null,
  });

  // Assignment storage service (mock for development)
  const [sceneLoader] = useState(() => new AssignmentSceneLoader(new MockAssignmentStorageService()));

  useEffect(() => {
    const updateContext = async () => {
      setContext(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        let routeType: WorkspaceRouteContext['routeType'] = 'dev';
        let mode: WorkspaceRouteContext['mode'] = 'teacher';
        let writeScope: WorkspaceRouteContext['writeScope'] = 'teacher-base';
        let baseScene: unknown | null = null;
        let overlayScene: unknown | null = null;
        let workspaceId: string | null = null;
        let assignmentId: string | null = null;
        let userId: string | null = null;
        let targetStudentId: string | null = null;

        // URL parameter parsing
        const sceneParam = searchParams.get('scene');
        const baseSceneParam = searchParams.get('base-scene');
        const overlaySceneParam = searchParams.get('overlay-scene');
        const modeParam = searchParams.get('mode');
        const writeScopeParam = searchParams.get('write-scope');
        const workspaceParam = searchParams.get('workspace');
        const studentParam = searchParams.get('student');
        const assignmentParam = searchParams.get('assignment');
        const userParam = searchParams.get('user');

        // Extract IDs from URL
        if (workspaceParam) workspaceId = workspaceParam;
        if (assignmentParam) assignmentId = assignmentParam;
        if (userParam) userId = userParam;
        if (studentParam) targetStudentId = studentParam;

        // Route type detection based on pathname patterns
        if (pathname.includes('/student/')) {
          routeType = 'student';
          mode = 'student';
          writeScope = 'student';
        } else if (pathname.includes('/teacher/')) {
          routeType = 'teacher';
          mode = 'teacher';
          writeScope = 'teacher-base';
        } else if (pathname.includes('/public/')) {
          routeType = 'public';
          mode = 'student';
          writeScope = 'student';
        } else {
          routeType = 'dev';
          mode = 'teacher';
          writeScope = 'teacher-base';
        }

        // Parameter overrides
        if (modeParam === 'student') {
          mode = 'student';
          writeScope = 'student';
        } else if (modeParam === 'teacher') {
          mode = 'teacher';
        }

        if (writeScopeParam) {
          const validScopes: Array<WorkspaceRouteContext['writeScope']> = ['teacher-base', 'student', 'teacher-review'];
          if (validScopes.includes(writeScopeParam as any)) {
            writeScope = writeScopeParam as WorkspaceRouteContext['writeScope'];
          }
        }

        // Special case: teacher reviewing specific student
        if (mode === 'teacher' && targetStudentId && !writeScopeParam) {
          writeScope = 'teacher-review';
        }

        // Assignment-based loading vs legacy URL-based loading
        if (assignmentId && userId) {
          console.log(`[useWorkspaceRoute] Loading assignment ${assignmentId} for user ${userId}`);
          
          let sceneData: LoadSceneResponse;
          
          if (mode === 'student') {
            // Student view: base = teacher, overlay = student layer
            sceneData = await sceneLoader.loadStudentView(assignmentId, userId);
          } else if (mode === 'teacher' && targetStudentId) {
            // Teacher reviewing student: base = teacher+student (locked), overlay = review
            sceneData = await sceneLoader.loadTeacherReview(assignmentId, userId, targetStudentId);
          } else {
            // Teacher editing base: base = teacher, overlay = null
            sceneData = await sceneLoader.loadTeacherBase(assignmentId, userId);
          }
          
          baseScene = sceneData.baseScene;
          overlayScene = sceneData.overlayScene;
          mode = sceneData.mode;
          writeScope = sceneData.writeScope;
          
          console.log(`[useWorkspaceRoute] Loaded assignment scenes:`, {
            hasBase: !!baseScene,
            hasOverlay: !!overlayScene,
            mode,
            writeScope
          });
        } else {
          // Legacy URL-based scene loading (for development/testing)
          console.log('[useWorkspaceRoute] Using legacy URL-based scene loading');
          
          if (sceneParam && !baseSceneParam && !overlaySceneParam) {
            try {
              baseScene = JSON.parse(decodeURIComponent(sceneParam));
            } catch (error) {
              console.warn('[useWorkspaceRoute] Invalid scene parameter:', error);
            }
          }

          if (baseSceneParam) {
            try {
              baseScene = JSON.parse(decodeURIComponent(baseSceneParam));
            } catch (error) {
              console.warn('[useWorkspaceRoute] Invalid base scene parameter:', error);
            }
          }

          if (overlaySceneParam) {
            try {
              overlayScene = JSON.parse(decodeURIComponent(overlaySceneParam));
            } catch (error) {
              console.warn('[useWorkspaceRoute] Invalid overlay scene parameter:', error);
            }
          }
        }

        setContext({
          mode,
          writeScope,
          baseScene,
          overlayScene,
          routeType,
          workspaceId,
          assignmentId,
          userId,
          targetStudentId,
          isLoading: false,
          error: null,
          // Deprecated fields for backward compatibility
          isReadonly: mode === 'student' && writeScope !== 'teacher-review',
          isTeacher: mode === 'teacher',
          initialScene: baseScene, // Legacy support
        });

        console.log('[useWorkspaceRoute] Route context updated:', {
          pathname,
          routeType,
          mode,
          writeScope,
          assignmentId,
          userId,
          targetStudentId,
          hasBaseScene: !!baseScene,
          hasOverlayScene: !!overlayScene
        });
      } catch (error) {
        console.error('[useWorkspaceRoute] Failed to load assignment:', error);
        setContext(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Failed to load assignment' 
        }));
      }
    };

    updateContext();
  }, [pathname, searchParams, sceneLoader]);

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
