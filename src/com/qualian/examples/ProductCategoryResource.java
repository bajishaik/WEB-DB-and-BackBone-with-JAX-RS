package com.qualian.examples;

import java.util.List;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@Path("/ProductCategory")
public class ProductCategoryResource {

	ProductCategoryDAO dao=new ProductCategoryDAO();
	
	@GET
	@Produces({MediaType.APPLICATION_JSON})
	public List<ProductCategory> findAll(){
		System.out.println("findAll");
		return dao.findAll();
	}
	
}
