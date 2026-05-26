'use client'

import { useState, useEffect } from 'react'
import { IconDroplet, IconEye, IconLeaf, IconScissors, IconCheck } from '@tabler/icons-react'

type TaskType = 'water' | 'inspect' | 'fertilize' | 'prune'

interface Task {
  id: string
  name: string
  type: TaskType
  frequency: string
  completed: boolean
}

interface TaskListProps {
  tasks: Task[]
}

const typeConfig: Record<TaskType, { bg: string; color: string; icon: React.ReactNode }> = {
  water: {
    bg: 'var(--info-bg)',
    color: 'var(--info)',
    icon: <IconDroplet size={16} strokeWidth={1.7} />,
  },
  inspect: {
    bg: 'var(--warning-bg)',
    color: 'var(--warning)',
    icon: <IconEye size={16} strokeWidth={1.7} />,
  },
  fertilize: {
    bg: 'var(--success-bg)',
    color: 'var(--success)',
    icon: <IconLeaf size={16} strokeWidth={1.7} />,
  },
  prune: {
    bg: 'var(--warning-bg)',
    color: 'var(--warning)',
    icon: <IconScissors size={16} strokeWidth={1.7} />,
  },
}

export function TaskList({ tasks: initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  return (
    <section>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--sage-900)',
          fontFamily: 'var(--font-sans)',
          margin: '0 0 10px 0',
        }}
      >
        Today's Tasks
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((task) => {
          const config = typeConfig[task.type]
          return (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 8,
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-default)',
                padding: '10px 12px',
              }}
            >
              {/* Type icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: config.bg,
                  color: config.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {config.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--sage-900)',
                    fontFamily: 'var(--font-sans)',
                    lineHeight: 1.3,
                    opacity: task.completed ? 0.5 : 1,
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}
                >
                  {task.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--sage-300)',
                    fontFamily: 'var(--font-sans)',
                    marginTop: 2,
                  }}
                >
                  {task.frequency}
                </div>
              </div>

              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task.id)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: task.completed ? 'none' : '1.5px solid var(--sage-300)',
                  background: task.completed ? 'var(--success)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
                aria-label={task.completed ? 'Mark as incomplete' : 'Mark as done'}
                aria-pressed={task.completed}
              >
                {task.completed && (
                  <IconCheck size={12} color="white" strokeWidth={2.5} />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
