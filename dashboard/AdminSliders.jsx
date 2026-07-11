import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api, { API_BASE_URL } from "../../services/api";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";
import Sidebar from "./Sidebar";
import "./Orders.css";

const AdminSliders = () => {
  const { admin, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page")) || 1;
  });
  const slidersPerPage = 10;

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
    }
  }, [admin, navigate]);

  useEffect(() => {
    const fetchSliders = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/sliders/admin");
        setSliders(response.data.data || []);
      } catch (err) {
        console.error("Slider sorgulama hatası:", err);
        setError(err.response?.data?.error || "Sliderlar getirilemedi.");
      } finally {
        setLoading(false);
      }
    };

    if (admin) {
      fetchSliders();
    }
  }, [admin]);

  useEffect(() => {
    if (parseInt(searchParams.get("page")) !== currentPage) {
      setSearchParams({ page: currentPage.toString() });
    }
  }, [currentPage, searchParams, setSearchParams]);

  const handleDelete = async (sliderId) => {
    if (window.confirm("Bu slider'ı silmek istediğinizden emin misiniz?")) {
      try {
        await api.delete(`/api/sliders/${sliderId}`);
        setSliders(sliders.filter((slider) => slider.id !== sliderId));
      } catch (err) {
        setError("Slider silinirken bir hata oluştu.");
      }
    }
  };

  const handleAddSlider = () => {
    navigate("/admin/sliders/add");
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const indexOfLastSlider = currentPage * slidersPerPage;
  const indexOfFirstSlider = indexOfLastSlider - slidersPerPage;
  const currentSliders = sliders.slice(indexOfFirstSlider, indexOfLastSlider);
  const totalPages = Math.ceil(sliders.length / slidersPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (!admin) return null;

  return (
    <div className="admin-orders">
      <header className="header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={isSidebarOpen ? "menu-icon-open" : "menu-icon-closed"}
          >
            <path
              className="line1"
              d="M4 6H20"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="line2"
              d="M4 12H14"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="line3"
              d="M4 18H9"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="header-title">Slider Yönetimi</h1>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin</h2>
          <button className="close-sidebar" onClick={toggleSidebar}>
            ✕
          </button>
        </div>
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      </aside>

      <main
        className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <section className="orders-section admin-sliders-section">
          <div className="filters">
            <div className="add-boss">
              <button onClick={handleAddSlider}>
                Slider Ekle
              </button>
            </div>
          </div>

          {loading && <p className="loading">Yükleniyor...</p>}
          {error && <p className="error">{error}</p>}
          {sliders.length === 0 && !loading && !error && (
            <p className="no-data">Slider bulunamadı.</p>
          )}
          {sliders.length > 0 && (
            <>
              <div className="table-wrapper">
                <table className="orders-table sliders-table">
                  <thead>
                    <tr>
                      <th>Resim</th>
                      <th>Sıra</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
  {currentSliders.map((slider) => (
    <tr key={slider.id}>
      <td data-label="Resim">
        <img
          src={`${API_BASE_URL}${slider.image_url}`}
          alt="Slider"
          style={{ width: "100px", height: "auto", maxHeight: "60px", objectFit: "contain" }}
        />
      </td>
      <td data-label="Sıra">{slider.order_number}</td>
      <td data-label="Durum">{slider.active ? "Aktif" : "Pasif"}</td>
      <td data-label="İşlemler" className="slider-actions-cell">
        <button
          className="action-btn edit-btn"
          onClick={() => navigate(`/admin/sliders/edit/${slider.id}`)}
        >
          <FaEdit />
        </button>
        <button
          className="action-btn delete-btn"
          onClick={() => handleDelete(slider.id)}
        >
          <FaTrash />
        </button>
      </td>
    </tr>
  ))}
</tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination" style={{ marginTop: "20px", textAlign: "center" }}>
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="action-btn"
                    style={{ margin: "0 10px" }}
                  >
                    Önceki
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => handlePageClick(index + 1)}
                      className={`action-btn ${currentPage === index + 1 ? "edit-btn" : ""}`}
                      style={{ margin: "0 5px" }}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="action-btn"
                    style={{ margin: "0 10px" }}
                  >
                    Sonraki
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminSliders;
