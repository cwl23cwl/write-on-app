/**
 * Assignment-Based Data Storage Types
 * 
 * Storage Structure per Assignment:
 * - Teacher base: 1 blob shared by all students
 * - Student layers: 1 blob per student  
 * - Teacher-review layers: 0–1 blob per student
 */

export interface ExcalidrawScene {
  elements: any[];
  appState: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export interface AssignmentStorage {
  /** Assignment identifier */
  assignmentId: string;
  /** Assignment metadata */
  assignment: AssignmentMetadata;
  /** Teacher's base layer - shared by all students */
  teacherBase: ExcalidrawScene;
  /** Student layers - one per student */
  studentLayers: Record<string, ExcalidrawScene>;
  /** Teacher review layers - optional, one per student */
  teacherReviews: Record<string, ExcalidrawScene>;
  /** Last modified timestamps for each layer */
  timestamps: {
    teacherBase: number;
    studentLayers: Record<string, number>;
    teacherReviews: Record<string, number>;
  };
}

export interface AssignmentMetadata {
  id: string;
  title: string;
  description?: string;
  createdBy: string; // Teacher ID
  createdAt: number;
  updatedAt: number;
  settings: AssignmentSettings;
}

export interface AssignmentSettings {
  /** Whether students can see each other's work */
  allowPeerView: boolean;
  /** Whether students can see teacher reviews */
  showReviewsToStudents: boolean;
  /** Assignment deadline */
  dueDate?: number;
  /** Whether assignment accepts late submissions */
  acceptLateSubmissions: boolean;
}

export interface LoadSceneRequest {
  assignmentId: string;
  viewerMode: 'student' | 'teacher';
  viewerId: string; // Student or Teacher ID
  targetStudentId?: string; // For teacher reviewing specific student
}

export interface LoadSceneResponse {
  baseScene: ExcalidrawScene;
  overlayScene: ExcalidrawScene | null;
  mode: 'teacher' | 'student';
  writeScope: 'teacher-base' | 'student' | 'teacher-review';
  metadata: {
    assignmentId: string;
    viewerId: string;
    targetStudentId?: string;
    canEdit: boolean;
    isLocked: boolean;
  };
}

export interface SaveSceneRequest {
  assignmentId: string;
  layer: 'teacher-base' | 'student' | 'teacher-review';
  scene: ExcalidrawScene;
  studentId?: string; // Required for student/teacher-review layers
  authorId: string; // Who is making the change
}

export interface SaveSceneResponse {
  success: boolean;
  timestamp: number;
  error?: string;
}

/**
 * Assignment Storage Service Interface
 * This would be implemented by the backend/database layer
 */
export interface AssignmentStorageService {
  /**
   * Load scene data for a specific view context
   */
  loadScene(request: LoadSceneRequest): Promise<LoadSceneResponse>;
  
  /**
   * Save changes to a specific layer
   */
  saveScene(request: SaveSceneRequest): Promise<SaveSceneResponse>;
  
  /**
   * Create a new assignment
   */
  createAssignment(metadata: Omit<AssignmentMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentMetadata>;
  
  /**
   * List assignments for a user
   */
  listAssignments(userId: string, role: 'teacher' | 'student'): Promise<AssignmentMetadata[]>;
}

/**
 * Scene Loading Logic
 */
export class AssignmentSceneLoader {
  constructor(private storageService: AssignmentStorageService) {}
  
  /**
   * Student View Loading:
   * - base-scene = teacher base
   * - overlay-scene = this student's layer  
   * - mode="student", write-scope="student"
   */
  async loadStudentView(assignmentId: string, studentId: string): Promise<LoadSceneResponse> {
    return this.storageService.loadScene({
      assignmentId,
      viewerMode: 'student',
      viewerId: studentId
    });
  }
  
  /**
   * Teacher Review Loading:
   * - base-scene = teacher base + student N's layer (both locked)
   * - overlay-scene = teacher-review for student N
   * - mode="teacher", write-scope="teacher-review"
   */
  async loadTeacherReview(assignmentId: string, teacherId: string, studentId: string): Promise<LoadSceneResponse> {
    return this.storageService.loadScene({
      assignmentId,
      viewerMode: 'teacher',
      viewerId: teacherId,
      targetStudentId: studentId
    });
  }
  
  /**
   * Teacher Base Editing:
   * - base-scene = teacher base
   * - overlay-scene = null
   * - mode="teacher", write-scope="teacher-base"
   */
  async loadTeacherBase(assignmentId: string, teacherId: string): Promise<LoadSceneResponse> {
    return this.storageService.loadScene({
      assignmentId,
      viewerMode: 'teacher',
      viewerId: teacherId
    });
  }
}

/**
 * Mock Storage Service for Development
 */
export class MockAssignmentStorageService implements AssignmentStorageService {
  private storage = new Map<string, AssignmentStorage>();
  
  async loadScene(request: LoadSceneRequest): Promise<LoadSceneResponse> {
    const assignment = this.storage.get(request.assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${request.assignmentId} not found`);
    }
    
    if (request.viewerMode === 'student') {
      // Student view: base = teacher, overlay = student layer
      const studentLayer = assignment.studentLayers[request.viewerId] || { elements: [], appState: {} };
      
      return {
        baseScene: assignment.teacherBase,
        overlayScene: studentLayer,
        mode: 'student',
        writeScope: 'student',
        metadata: {
          assignmentId: request.assignmentId,
          viewerId: request.viewerId,
          canEdit: true,
          isLocked: false
        }
      };
    } else {
      // Teacher view
      if (request.targetStudentId) {
        // Teacher reviewing student: base = teacher + student (locked), overlay = review
        const studentLayer = assignment.studentLayers[request.targetStudentId] || { elements: [], appState: {} };
        const reviewLayer = assignment.teacherReviews[request.targetStudentId] || { elements: [], appState: {} };
        
        // Composite teacher base + student layer for base scene
        const compositeBase = this.compositeLayers(assignment.teacherBase, studentLayer);
        
        return {
          baseScene: compositeBase,
          overlayScene: reviewLayer,
          mode: 'teacher',
          writeScope: 'teacher-review',
          metadata: {
            assignmentId: request.assignmentId,
            viewerId: request.viewerId,
            targetStudentId: request.targetStudentId,
            canEdit: true,
            isLocked: false
          }
        };
      } else {
        // Teacher editing base: base = teacher, overlay = null
        return {
          baseScene: assignment.teacherBase,
          overlayScene: null,
          mode: 'teacher',
          writeScope: 'teacher-base',
          metadata: {
            assignmentId: request.assignmentId,
            viewerId: request.viewerId,
            canEdit: true,
            isLocked: false
          }
        };
      }
    }
  }
  
  async saveScene(request: SaveSceneRequest): Promise<SaveSceneResponse> {
    const assignment = this.storage.get(request.assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${request.assignmentId} not found`);
    }
    
    const timestamp = Date.now();
    
    switch (request.layer) {
      case 'teacher-base':
        assignment.teacherBase = request.scene;
        assignment.timestamps.teacherBase = timestamp;
        break;
      case 'student':
        if (!request.studentId) throw new Error('studentId required for student layer');
        assignment.studentLayers[request.studentId] = request.scene;
        assignment.timestamps.studentLayers[request.studentId] = timestamp;
        break;
      case 'teacher-review':
        if (!request.studentId) throw new Error('studentId required for teacher-review layer');
        assignment.teacherReviews[request.studentId] = request.scene;
        assignment.timestamps.teacherReviews[request.studentId] = timestamp;
        break;
    }
    
    return { success: true, timestamp };
  }
  
  async createAssignment(metadata: Omit<AssignmentMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentMetadata> {
    const id = `assignment-${Date.now()}`;
    const now = Date.now();
    const fullMetadata: AssignmentMetadata = {
      ...metadata,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    const assignment: AssignmentStorage = {
      assignmentId: id,
      assignment: fullMetadata,
      teacherBase: { elements: [], appState: {} },
      studentLayers: {},
      teacherReviews: {},
      timestamps: {
        teacherBase: now,
        studentLayers: {},
        teacherReviews: {}
      }
    };
    
    this.storage.set(id, assignment);
    return fullMetadata;
  }
  
  async listAssignments(userId: string, role: 'teacher' | 'student'): Promise<AssignmentMetadata[]> {
    // Mock implementation - return all assignments for now
    return Array.from(this.storage.values()).map(a => a.assignment);
  }
  
  private compositeLayers(base: ExcalidrawScene, overlay: ExcalidrawScene): ExcalidrawScene {
    return {
      elements: [
        ...base.elements.map(el => ({ ...el, locked: true, owner: 'teacher' })),
        ...overlay.elements.map(el => ({ ...el, locked: true, owner: el.owner || 'student' }))
      ],
      appState: { ...base.appState, ...overlay.appState },
      files: { ...base.files, ...overlay.files }
    };
  }
}