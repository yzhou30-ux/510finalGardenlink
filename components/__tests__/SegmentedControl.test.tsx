import { render, screen, fireEvent } from '@testing-library/react'
import { SegmentedControl } from '@/components/SegmentedControl'

describe('SegmentedControl', () => {
  const options = ['Public Garden', 'My Garden']
  const onChange = jest.fn()

  beforeEach(() => {
    onChange.mockClear()
  })

  it('renders all options', () => {
    render(<SegmentedControl options={options} value="Public Garden" onChange={onChange} />)
    expect(screen.getByText('Public Garden')).toBeInTheDocument()
    expect(screen.getByText('My Garden')).toBeInTheDocument()
  })

  it('calls onChange when clicking an unselected option', () => {
    render(<SegmentedControl options={options} value="Public Garden" onChange={onChange} />)
    fireEvent.click(screen.getByText('My Garden'))
    expect(onChange).toHaveBeenCalledWith('My Garden')
  })

  it('calls onChange when clicking the already-selected option', () => {
    render(<SegmentedControl options={options} value="Public Garden" onChange={onChange} />)
    fireEvent.click(screen.getByText('Public Garden'))
    // SegmentedControl always fires onChange on click regardless of current selection
    expect(onChange).toHaveBeenCalledWith('Public Garden')
  })

  it('marks the selected option with aria-selected=true', () => {
    render(<SegmentedControl options={options} value="My Garden" onChange={onChange} />)
    const myGardenBtn = screen.getByRole('tab', { name: 'My Garden' })
    expect(myGardenBtn).toHaveAttribute('aria-selected', 'true')
  })

  it('marks unselected options with aria-selected=false', () => {
    render(<SegmentedControl options={options} value="My Garden" onChange={onChange} />)
    const publicBtn = screen.getByRole('tab', { name: 'Public Garden' })
    expect(publicBtn).toHaveAttribute('aria-selected', 'false')
  })
})
