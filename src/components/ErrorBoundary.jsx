import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  handleGoHome = () => {
    this.setState({ hasError: false })
    window.location.hash = '#/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed] px-5">
          <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-base font-semibold text-gray-700 mb-2">
              エラーが発生しました
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              予期しないエラーが発生しました。下のボタンから復帰してください。
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-accent2 text-white py-2.5 rounded-xl text-sm font-semibold
                  hover:opacity-90 transition-opacity"
              >
                再読み込み
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm
                  hover:bg-gray-200 transition-colors"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
