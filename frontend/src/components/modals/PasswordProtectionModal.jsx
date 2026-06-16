import { Modal, Button } from "react-bootstrap"
import { useState } from "react"
import PropTypes from "prop-types"

function PasswordProtectionModal({ show, token, onPasswordVerified, onCancel }) {
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!password.trim()) {
            setError("Please enter a password")
            return
        }

        setLoading(true)
        setError("")

        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/links/verify_password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        token: token,
                        password: password
                    })
                }
            )

            const result = await response.json()

            if (!result.success) {
                setError(result.message || "Incorrect password")
            } else {
                // Password verified successfully
                onPasswordVerified(result)
                setPassword("") // Clear input
            }
        } catch (err) {
            setError("Something went wrong. Please try again.")
            console.error("Password verification error:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        setPassword("")
        setError("")
        onCancel()
    }

    return (
        <Modal show={show} onHide={handleCancel} centered backdrop="static" keyboard={false}>
            <Modal.Header closeButton>
                <Modal.Title>
                    <span className="me-2">🔒</span>
                    Password Protected Link
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <p className="text-muted mb-3">
                    This link is password protected. Please enter the password to continue:
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <input
                            type="password"
                            className={`form-control ${error ? "is-invalid" : ""}`}
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                if (error) setError("") // Clear error on input
                            }}
                            disabled={loading}
                            autoFocus
                        />
                        {error && (
                            <div className="invalid-feedback d-block mt-2">
                                <small>❌ {error}</small>
                            </div>
                        )}
                    </div>

                    <div className="d-grid gap-2">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !password.trim()}
                        >
                            {loading ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm me-2"
                                        role="status"
                                        aria-hidden="true"
                                    />
                                    Verifying...
                                </>
                            ) : (
                                "Unlock & View"
                            )}
                        </button>
                    </div>
                </form>
            </Modal.Body>

            <Modal.Footer>
                <Button
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={loading}
                >
                    Go Back
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

PasswordProtectionModal.propTypes = {
    show: PropTypes.bool.isRequired,
    token: PropTypes.string.isRequired,
    onPasswordVerified: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
}

export default PasswordProtectionModal