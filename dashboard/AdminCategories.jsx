import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { FaEdit, FaTrash } from "react-icons/fa";
import Sidebar from "./Sidebar";
import Switch from "react-switch"; // For toggling is_active
import "./Orders.css";

const AdminCategories = () => {
  const { admin, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "active", "inactive"
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page")) || 1;
  });
  const categoriesPerPage = 10;

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
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/categories?include_inactive=true");
        console.log("API Response:", response.data);
        const categoriesData = response.data.data || [];
        if (!Array.isArray(categoriesData)) {
          throw new Error("API'den dönen veri bir dizi değil.");
        }
        setCategories(categoriesData);
        setFilteredCategories(categoriesData);
      } catch (err) {
        console.error("Fetch Categories Error:", err);
        console.error("Error Response:", err.response);
        setError(err.response?.data?.error || "Kategoriler getirilemedi.");
      } finally {
        setLoading(false);
      }
    };

    if (admin) {
      fetchCategories();
    }
  }, [admin]);

  useEffect(() => {
    let filtered = [...categories];
    if (searchTerm) {
      filtered = filtered.filter(
        (category) =>
          category.id.toString().includes(searchTerm) ||
          (category.name &&
            category.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Aktiflik filtresi
    if (activeFilter === "active") {
      filtered = filtered.filter((category) => category.is_active === 1 || category.is_active === true);
    } else if (activeFilter === "inactive") {
      filtered = filtered.filter((category) => category.is_active === 0 || category.is_active === false);
    }
    setFilteredCategories(filtered);

    const pageFromUrl = parseInt(searchParams.get("page")) || 1;
    if (
      filtered.length > 0 &&
      pageFromUrl > Math.ceil(filtered.length / categoriesPerPage)
    ) {
      setCurrentPage(1);
      setSearchParams({ page: "1" });
    } else if (searchTerm) {
      setCurrentPage(1);
      setSearchParams({ page: "1" });
    } else {
      setCurrentPage(pageFromUrl);
    }
  }, [searchTerm, categories, searchParams, setSearchParams, activeFilter]);

  useEffect(() => {
    if (parseInt(searchParams.get("page")) !== currentPage) {
      setSearchParams({ page: currentPage.toString() });
    }
  }, [currentPage, searchParams, setSearchParams]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDelete = async (categoryId) => {
    if (window.confirm("Bu kategoriyi silmek istediğinizden emin misiniz?")) {
      try {
        await api.delete(`/api/categories/${categoryId}`);
        setCategories(
          categories.filter((category) => category.id !== categoryId)
        );
      } catch (err) {
        setError(
          err.response?.data?.error || "Kategori silinirken bir hata oluştu."
        );
      }
    }
  };

  const handleSwitchChange = async (categoryId, checked) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      setError("Kategori bulunamadı.");
      return;
    }

    const previousCategories = [...categories];
    setCategories(
      categories.map((category) =>
        category.id === categoryId
          ? { ...category, is_active: checked }
          : category
      )
    );

    try {
      await api.put(`/api/categories/${categoryId}`, { is_active: checked });
    } catch (err) {
      setCategories(previousCategories);
      const errorMessage =
        err.response?.data?.error ||
        "Aktiflik durumu güncellenirken bir hata oluştu.";
      setError(errorMessage);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const indexOfLastCategory = currentPage * categoriesPerPage;
  const indexOfFirstCategory = indexOfLastCategory - categoriesPerPage;
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    // Aktif kategoriler üstte
    const aActive = (a.is_active === 1 || a.is_active === true) ? 0 : 1;
    const bActive = (b.is_active === 1 || b.is_active === true) ? 0 : 1;
    return aActive - bActive;
  });
  const currentCategories = sortedCategories.slice(
    indexOfFirstCategory,
    indexOfLastCategory
  );
  const totalPages = Math.ceil(filteredCategories.length / categoriesPerPage);

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
        <h1 className="header-title">Kategori Yönetimi</h1>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin</h2>
          <button className="close-sidebar" onClick={toggleSidebar}>
            ✕
          </button>
        </div>
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </aside>

      <main
        className={`main-content ${
          isSidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        <section className="orders-section admin-categories-section">
          <div className="filters">
            <input
              type="text"
              placeholder="Kategori Adı..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-bar"
            />
            <div className="add-boss">
              <button onClick={() => navigate("/admin/categories/add")}>
                Kategori Ekle
              </button>
            </div>
          </div>

          {/* Aktiflik Filtre Butonları */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                background: activeFilter === 'all' ? '#007bff' : '#e9ecef',
                color: activeFilter === 'all' ? '#fff' : '#333',
              }}
            >
              Tümü ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("active")}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                background: activeFilter === 'active' ? '#28a745' : '#e9ecef',
                color: activeFilter === 'active' ? '#fff' : '#333',
              }}
            >
              Aktif ({categories.filter(c => c.is_active === 1 || c.is_active === true).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("inactive")}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                background: activeFilter === 'inactive' ? '#dc3545' : '#e9ecef',
                color: activeFilter === 'inactive' ? '#fff' : '#333',
              }}
            >
              Pasif ({categories.filter(c => c.is_active === 0 || c.is_active === false).length})
            </button>
          </div>

          {loading && <p className="loading">Yükleniyor...</p>}
          {error && <p className="error">{error}</p>}
          {filteredCategories.length === 0 && !loading && !error && (
            <p className="no-data">Kategori bulunamadı.</p>
          )}
          {filteredCategories.length > 0 && (
            <>
              <div className="table-wrapper">
                <table className="orders-table categories-table">
                  <thead>
                    <tr>
                      {/* <th>ID</th> */}
                      <th style={{ textAlign: 'center' }}>Kategori Adı</th>
                      <th style={{ textAlign: 'center' }}>Durum</th>
                      <th style={{ textAlign: 'center' }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCategories.map((category) => (
                      <tr key={category.id}>
                        {/* <td data-label="ID">{category.id}</td> */}
                        <td data-label="Kategori Adı" style={{ textAlign: 'center' }}>{category.name}</td>
                        <td data-label="Durum" style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: (category.is_active === 1 || category.is_active === true) ? '#d4edda' : '#f8d7da',
                            color: (category.is_active === 1 || category.is_active === true) ? '#155724' : '#721c24',
                          }}>
                            {(category.is_active === 1 || category.is_active === true) ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td data-label="İşlemler" className="category-actions-cell">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                            <button
                              className="action-btn edit-btn"
                              onClick={() => navigate(`/admin/categories/edit/${category.id}`)}
                              style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <FaEdit size={16} />
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={() => handleDelete(category.id)}
                              style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <FaTrash size={16} />
                            </button>
                            <Switch
                              checked={category.is_active}
                              onChange={(checked) => handleSwitchChange(category.id, checked)}
                              offColor="#d1d5db"
                              onColor="#10b981"
                              offHandleColor="#fff"
                              onHandleColor="#fff"
                              height={24}
                              width={48}
                              handleDiameter={20}
                              boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
                              activeBoxShadow="0px 0px 1px 5px rgba(0, 0, 0, 0.1)"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="pagination"
                style={{ marginTop: "20px", textAlign: "center" }}
              >
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
                    className={`action-btn ${
                      currentPage === index + 1 ? "edit-btn" : ""
                    }`}
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
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminCategories;
