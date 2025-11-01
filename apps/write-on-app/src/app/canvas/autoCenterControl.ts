type ResumeHandler = (() => void) | null

let resumeHandler: ResumeHandler = null

export function setAutoCenterResumeHandler(handler: ResumeHandler) {
  resumeHandler = handler
}

export function triggerAutoCenterResume() {
  if (resumeHandler) {
    resumeHandler()
  }
}
