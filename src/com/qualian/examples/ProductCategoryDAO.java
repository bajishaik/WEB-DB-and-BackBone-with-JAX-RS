package com.qualian.examples;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;


public class ProductCategoryDAO {

    public List<ProductCategory> findAll() {
        List<ProductCategory> list = new ArrayList<ProductCategory>();
        Connection c = null;
    	String sql = "SELECT * FROM m_product_category ORDER BY name";
        try {
            c = ConnectionHelper.getConnection();
            Statement s = c.createStatement();
            ResultSet rs = s.executeQuery(sql);
            while (rs.next()) {
                list.add(processRow(rs));
            }
        } catch (SQLException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
		} finally {
			ConnectionHelper.close(c);
		}
        return list;
    }

    
    public List<ProductCategory> findByName(String name) {
        List<ProductCategory> list = new ArrayList<ProductCategory>();
        Connection c = null;
    	String sql = "SELECT * FROM m_product_category as e " +
			"WHERE UPPER(name) LIKE ? " +	
			"ORDER BY name";
        try {
            c = ConnectionHelper.getConnection();
            PreparedStatement ps = c.prepareStatement(sql);
            ps.setString(1, "%" + name.toUpperCase() + "%");
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                list.add(processRow(rs));
            }
        } catch (SQLException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
		} finally {
			ConnectionHelper.close(c);
		}
        return list;
    }
    
    public ProductCategory findById(int id) {
    	String sql = "SELECT * FROM m_product_category WHERE m_product_category_id = ?";
    	ProductCategory productCategory = null;
        Connection c = null;
        try {
            c = ConnectionHelper.getConnection();
            PreparedStatement ps = c.prepareStatement(sql);
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
            	productCategory = processRow(rs);
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
		} finally {
			ConnectionHelper.close(c);
		}
        return productCategory;
    }

    public ProductCategory save(ProductCategory productCategory)
	{
		return productCategory.getId()!= "" ? update(productCategory) : create(productCategory);
	}    
    
    public ProductCategory create(ProductCategory productCategory) {
        Connection c = null;
        PreparedStatement ps = null;
        try {
            c = ConnectionHelper.getConnection();
            
            StringBuffer insQuery=new StringBuffer();
            insQuery.append(" INSERT INTO m_product_category(");
            insQuery.append(" m_product_category_id, ad_client_id, ad_org_id, isactive, created, ");
            insQuery.append(" createdby, updated, updatedby, value, name, description, isdefault");
            insQuery.append(")VALUES (?,'23C59575B9CF467C9620760EB255B389','19404EAD144C49A0AF37D54377CF452D','Y',now(),'100',now(),'100',?,?,?,'N');");
            
            ps = c.prepareStatement(insQuery.toString());
            ps.setString(1, productCategory.getId());
            ps.setString(2, productCategory.getSearchKey());
            ps.setString(3, productCategory.getName());
            ps.setString(4, productCategory.getDescription());
            
            ps.executeUpdate();
            ResultSet rs = ps.getGeneratedKeys();
            rs.next();
            // Update the id in the returned object. This is important as this value must be returned to the client.
            String id = rs.getString(1);
            productCategory.setId(id);
            
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
		} finally {
			ConnectionHelper.close(c);
		}
        return productCategory;
    }

    public ProductCategory update(ProductCategory productCategory) {
        Connection c = null;
        try {
            c = ConnectionHelper.getConnection();
            
            StringBuffer updQuery=new StringBuffer();
            updQuery.append("UPDATE m_product_category SET value=?, name=?,description=? WHERE m_product_category_id=?;");
            
            PreparedStatement ps = c.prepareStatement(updQuery.toString());
            ps.setString(1, productCategory.getSearchKey());
            ps.setString(2, productCategory.getName());
            ps.setString(3, productCategory.getDescription());            
                        
            ps.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
		} finally {
			ConnectionHelper.close(c);
		}
        return productCategory;
    }

    public boolean remove(int id) {
        Connection c = null;
        try {
            c = ConnectionHelper.getConnection();
            PreparedStatement ps = c.prepareStatement("DELETE FROM m_product_category WHERE m_product_category_id=?");
            ps.setInt(1, id);
            int count = ps.executeUpdate();
            return count == 1;
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
		} finally {
			ConnectionHelper.close(c);
		}
    }

    protected ProductCategory processRow(ResultSet rs) throws SQLException {
    	ProductCategory productCategory = new ProductCategory();
    	
        productCategory.setId(rs.getString(1));
        productCategory.setClient(rs.getString(2));
        productCategory.setOrganization(rs.getString(3));
        productCategory.setActive(rs.getString(4));
        productCategory.setCreationDate(rs.getString(5));
        productCategory.setCreatedBy(rs.getString(6));
        productCategory.setUpdated(rs.getString(7));
        productCategory.setUpdatedBy(rs.getString(8));
        productCategory.setSearchKey(rs.getString(9));
        productCategory.setName(rs.getString(10));
        productCategory.setDescription(rs.getString(11));
        productCategory.setDefaultvalue(rs.getString(12));

        return productCategory;
    }
    
}
