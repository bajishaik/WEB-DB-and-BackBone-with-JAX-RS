package com.qualian.examples;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ResourceBundle;


public class ConnectionHelper{
	
	static ConnectionHelper instance=null;
	private String url=null;
	
	private ConnectionHelper(){
		
		try{
			ResourceBundle bundle=ResourceBundle.getBundle("database");
		
			String driver=bundle.getString("bbdd.driver");
			url=bundle.getString("bbdd.url");
			String sid=bundle.getString("bbdd.sid");
			String user=bundle.getString("bbdd.user");
			String password=bundle.getString("bbdd.password");
			
			url=url+"/"+sid+"?user="+user+"&password="+password;
			
			System.out.println("url:"+url);
			Class.forName(driver);
			
			
		}catch(Exception e){
			e.printStackTrace();
		}
	}
	
	public static Connection getConnection() throws SQLException{
		
		if(instance==null){
			instance=new ConnectionHelper();
		}
		try{
			
			System.out.println(instance.url);
			return DriverManager.getConnection(instance.url);
		}catch(SQLException e){
			throw e;
		}
	}
	
	public static void close(Connection connection)
	{
		try {
			if (connection != null) {
				connection.close();
			}
		} catch (SQLException e) {
			e.printStackTrace();
		}
	}
}