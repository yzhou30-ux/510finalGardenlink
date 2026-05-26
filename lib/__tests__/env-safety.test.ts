import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

describe('Environment variable safety', () => {
  it('should not have process.env non-null assertions in source files', () => {
    const result = execSync(
      `grep -rn 'process\\.env\\.[A-Z_]*!' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v .next | grep -v __tests__ | grep -v /legacy/ || true`,
      { encoding: 'utf8', cwd: path.resolve(__dirname, '../..') }
    )
    expect(result.trim()).toBe('')
  })

  it('should have .env.example with required variables', () => {
    const envExamplePath = path.resolve(__dirname, '../../.env.example')
    expect(fs.existsSync(envExamplePath)).toBe(true)
    const content = fs.readFileSync(envExamplePath, 'utf8')
    expect(content).toContain('NEXT_PUBLIC_SUPABASE_URL')
    expect(content).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  })

  it('should have .env*.local in .gitignore', () => {
    const gitignorePath = path.resolve(__dirname, '../../.gitignore')
    const content = fs.readFileSync(gitignorePath, 'utf8')
    expect(content).toMatch(/\.env\*\.local|\.env\.local/)
  })
})
